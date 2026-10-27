import Papa from 'papaparse';
import { clientIp, writeAudit } from './audit';
import type { CurrentUser } from './auth';
import { prisma } from './db';
import { getInstitutionStats } from './stats';
import { maskApaar } from './verify';

const scopeOf = (u: CurrentUser) => (u.role === 'INSTITUTION_ADMIN' ? u.institutionId : null);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

export async function coverageRows(u: CurrentUser, year?: string) {
  const { stats, year: y } = await getInstitutionStats({ year, institutionId: scopeOf(u) });
  const byStatus = await prisma.studentRecord.groupBy({ by: ['institutionId', 'status'], where: year ? { admissionYear: year } : {}, _count: { _all: true } });
  const n = (id: string, st: string) => (byStatus as any[]).find((r) => r.institutionId === id && r.status === st)?._count._all ?? 0;
  const enrolledKey = `enrolled_${(year ?? y)}`;
  return stats.map((s) => ({ institution: s.name, aicte_id: s.aicteId, state: s.state, city: s.city, type: s.type, approved_intake: s.approvedTotal, supernumerary: s.ssTotal, [enrolledKey]: s.enrolled, fill_pct: Math.round(s.fillPct * 10) / 10,
    records: s.records, verified: n(s.id, 'VERIFIED'), flagged: n(s.id, 'FLAGGED'), pending: n(s.id, 'PENDING'), rejected: n(s.id, 'REJECTED'), open_flags: s.openFlags, open_blockers: s.openBlockers, risk_score: s.risk ?? '' }));
}

export async function overIntakeRows(u: CurrentUser) {
  const scope = scopeOf(u);
  const [courses, counts, insts] = await Promise.all([
    prisma.course.findMany({ where: scope ? { institutionId: scope } : {}, include: { institution: { select: { name: true } } } }),
    prisma.studentRecord.groupBy({ by: ['courseId', 'admissionYear'], where: scope ? { institutionId: scope } : {}, _count: { _all: true } }),
    prisma.institution.findMany({ where: scope ? { id: scope } : {} }),
  ]);
  const rows: Record<string, string | number>[] = [];
  for (const c of courses as any[]) for (const k of (counts as any[]).filter((x) => x.courseId === c.id)) {
    const limit = c.approvedIntake + c.supernumerarySeats, enrolled = k._count._all;
    if (enrolled > limit) rows.push({ institution: c.institution.name, course: c.name, year: k.admissionYear, approved_intake: c.approvedIntake, supernumerary: c.supernumerarySeats, limit, enrolled, excess: enrolled - limit, excess_pct_of_approved: pct(enrolled - c.approvedIntake, c.approvedIntake) });
  }
  const years = [...new Set((counts as any[]).map((x) => x.admissionYear))] as string[];
  for (const i of insts as any[]) for (const y of years) {
    const ids = (courses as any[]).filter((c) => c.institutionId === i.id), limit = ids.reduce((s, c) => s + c.approvedIntake + c.supernumerarySeats, 0);
    const enrolled = (counts as any[]).filter((x) => ids.some((c) => c.id === x.courseId) && x.admissionYear === y).reduce((s, x) => s + x._count._all, 0);
    if (enrolled > limit) rows.push({ institution: i.name, course: 'ALL COURSES', year: y, approved_intake: i.approvedIntakeTotal, supernumerary: limit - i.approvedIntakeTotal, limit, enrolled, excess: enrolled - limit, excess_pct_of_approved: pct(enrolled - i.approvedIntakeTotal, i.approvedIntakeTotal) });
  }
  return rows;
}

export async function flagReportRows(u: CurrentUser) {
  const scope = scopeOf(u);
  const flags: any[] = await prisma.flag.findMany({ where: scope ? { institutionId: scope } : {}, orderBy: { createdAt: 'desc' }, include: { record: { select: { id: true, apaarId: true, admissionYear: true } }, institution: { select: { name: true } } } });
  return flags.map((f) => ({ flag_id: f.id, rule: f.ruleCode, severity: f.severity, status: f.status, institution: f.institution.name, record_id: f.record?.id ?? '', apaar_id_masked: f.record?.apaarId ? maskApaar(f.record.apaarId) : '', admission_year: f.record?.admissionYear ?? '', message: f.message, confidence: f.confidence ?? '', raised_at: f.createdAt.toISOString(), resolved_at: f.resolvedAt?.toISOString() ?? '' }));
}

export async function csvResponse(req: Request, u: CurrentUser, name: string, rows: Record<string, unknown>[]) {
  await writeAudit({ actorUserId: u.id, actorRole: u.role, action: 'REPORT_EXPORT', entityType: 'Report', entityId: name, after: { rows: rows.length, format: 'csv' }, ip: clientIp(req) });
  const body = rows.length ? Papa.unparse(rows) : 'no_rows\n';
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` } });
}
