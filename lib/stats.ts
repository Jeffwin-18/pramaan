import { prisma } from './db';

export interface Factor { key: string; label: string; display: string; weight: number; subScore: number; points: number }
export interface InstStat {
  id: string; name: string; state: string; type: string; city: string; aicteId: string;
  approvedTotal: number; ssTotal: number; enrolledByYear: Record<string, number>; enrolled: number; fillPct: number; overIntake: boolean;
  records: number; verified: number; openFlags: number; openBlockers: number; risk: number | null; riskExplanation: string | null; factors: Factor[]; riskComputedAt: string | null;
}
export interface Filters { year?: string; state?: string; type?: string; institutionId?: string | null }

export async function getInstitutionStats(f: Filters = {}): Promise<{ stats: InstStat[]; year: string; years: string[] }> {
  const where: Record<string, unknown> = {};
  if (f.state) where.state = f.state; if (f.type) where.type = f.type; if (f.institutionId) where.id = f.institutionId;
  const [insts, recs, flags, courses, risks] = await Promise.all([
    prisma.institution.findMany({ where, orderBy: { name: 'asc' } }),
    prisma.studentRecord.groupBy({ by: ['institutionId', 'admissionYear', 'status'], _count: { _all: true } }),
    prisma.flag.groupBy({ by: ['institutionId', 'severity'], where: { status: { not: 'RESOLVED' } }, _count: { _all: true } }),
    prisma.course.findMany({ select: { institutionId: true, supernumerarySeats: true } }),
    prisma.riskScore.findMany(),
  ]);
  const years = [...new Set((recs as any[]).map((r) => r.admissionYear))].sort() as string[];
  // default year: latest year in which at least one institution has reported half its approved intake
  const byInstYear = new Map<string, number>();
  (recs as any[]).forEach((r) => byInstYear.set(`${r.institutionId}|${r.admissionYear}`, (byInstYear.get(`${r.institutionId}|${r.admissionYear}`) ?? 0) + r._count._all));
  const year = f.year || [...years].reverse().find((y) => (insts as any[]).some((i) => (byInstYear.get(`${i.id}|${y}`) ?? 0) >= 0.5 * i.approvedIntakeTotal)) || years[years.length - 1] || '';
  const riskMap = new Map((risks as any[]).map((r) => [r.institutionId, r]));
  const stats = (insts as any[]).map((i): InstStat => {
    const mine = (recs as any[]).filter((r) => r.institutionId === i.id);
    const enrolledByYear: Record<string, number> = {};
    mine.forEach((r) => (enrolledByYear[r.admissionYear] = (enrolledByYear[r.admissionYear] ?? 0) + r._count._all));
    const ssTotal = (courses as any[]).filter((c) => c.institutionId === i.id).reduce((s, c) => s + c.supernumerarySeats, 0);
    const scoped = f.year ? mine.filter((r) => r.admissionYear === f.year) : mine;
    const fl = (flags as any[]).filter((x) => x.institutionId === i.id);
    const rk = riskMap.get(i.id); const enrolled = enrolledByYear[year] ?? 0;
    return {
      id: i.id, name: i.name, state: i.state, type: i.type, city: i.city, aicteId: i.aicteId, approvedTotal: i.approvedIntakeTotal, ssTotal, enrolledByYear, enrolled,
      fillPct: (enrolled / i.approvedIntakeTotal) * 100, overIntake: enrolled > i.approvedIntakeTotal + ssTotal,
      records: scoped.reduce((s, r) => s + r._count._all, 0), verified: scoped.filter((r) => r.status === 'VERIFIED').reduce((s, r) => s + r._count._all, 0),
      openFlags: fl.filter((x) => x.severity !== 'INFO').reduce((s, x) => s + x._count._all, 0), openBlockers: fl.filter((x) => x.severity === 'BLOCKER').reduce((s, x) => s + x._count._all, 0),
      risk: rk?.score ?? null, riskExplanation: rk?.explanation ?? null, factors: rk ? JSON.parse(rk.factorsJson) : [], riskComputedAt: rk?.computedAt?.toISOString() ?? null,
    };
  });
  return { stats, year, years };
}

export async function getOverview(f: Filters) {
  const { stats, year, years } = await getInstitutionStats(f);
  const ids = stats.map((s) => s.id);
  const flagWhere: Record<string, unknown> = { institutionId: { in: ids }, status: { not: 'RESOLVED' } };
  if (f.year) flagWhere.OR = [{ record: { is: { admissionYear: f.year } } }, { recordId: null }];
  const [byRule, activity] = await Promise.all([
    prisma.flag.groupBy({ by: ['ruleCode', 'severity'], where: flagWhere, _count: { _all: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  const actorIds = [...new Set((activity as any[]).map((a) => a.actorUserId).filter(Boolean))] as string[];
  const users = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const um = new Map((users as any[]).map((u) => [u.id, u.name]));
  const total = stats.reduce((s, x) => s + x.records, 0), verified = stats.reduce((s, x) => s + x.verified, 0);
  const states = [...new Set(stats.map((s) => s.state))].sort().map((st) => {
    const g = stats.filter((s) => s.state === st);
    const rec = g.reduce((s, x) => s + x.records, 0), ver = g.reduce((s, x) => s + x.verified, 0);
    return { state: st, institutions: g.length, reporting: g.filter((x) => x.records > 0).length, records: rec, verifiedPct: rec ? (ver / rec) * 100 : 0, openFlags: g.reduce((s, x) => s + x.openFlags, 0), overIntake: g.filter((x) => x.overIntake).length };
  });
  return {
    stats, year, years, states,
    kpi: { reporting: stats.filter((s) => s.records > 0).length, institutions: stats.length, records: total, verifiedPct: total ? (verified / total) * 100 : 0, openBlockers: (byRule as any[]).filter((r) => r.severity === 'BLOCKER').reduce((s, r) => s + r._count._all, 0), overIntake: stats.filter((s) => s.overIntake).length },
    rules: Object.values((byRule as any[]).reduce((m: any, r) => ((m[r.ruleCode] ??= { rule: r.ruleCode, count: 0 }).count += r._count._all, m), {})) as { rule: string; count: number }[],
    activity: (activity as any[]).map((a) => ({ id: a.id, who: a.actorUserId ? um.get(a.actorUserId) ?? a.actorRole : 'Anonymous', role: a.actorRole, action: a.action, entity: a.entityId, at: a.createdAt.toISOString() })),
  };
}

export async function getInstitutionDetail(id: string) {
  const inst: any = await prisma.institution.findUnique({ where: { id }, include: { courses: { orderBy: { id: 'asc' } } } });
  if (!inst) return null;
  const [recs, flags, batches] = await Promise.all([
    prisma.studentRecord.groupBy({ by: ['courseId', 'admissionYear'], where: { institutionId: id }, _count: { _all: true } }),
    prisma.flag.findMany({ where: { institutionId: id, status: { not: 'RESOLVED' } }, include: { record: { select: { fullName: true, apaarId: true } } }, take: 200 }),
    prisma.uploadBatch.findMany({ where: { institutionId: id }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  const rank: Record<string, number> = { BLOCKER: 0, WARNING: 1, INFO: 2 };
  return { inst, recs: recs as any[], batches: batches as any[], flags: (flags as any[]).sort((a, b) => rank[a.severity] - rank[b.severity] || +b.createdAt - +a.createdAt) };
}
