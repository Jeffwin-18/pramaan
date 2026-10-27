// Recomputes stored risk scores from live data. Called after commits and flag actions.
// Years with under 50% of approved intake reported are treated as partial and excluded, so a
// half-finished upload does not distort the score. Falls back to all years if none qualify.
import { prisma } from './db';
import { computeRiskScores, type RiskInput } from './risk';

export async function refreshRiskScores() {
  const [insts, recs, flags] = await Promise.all([
    prisma.institution.findMany(),
    prisma.studentRecord.findMany({ select: { id: true, institutionId: true, admissionYear: true } }),
    prisma.flag.findMany({ where: { recordId: { not: null }, status: { not: 'RESOLVED' } }, select: { recordId: true, severity: true, ruleCode: true } }),
  ]);
  const flagsBy = new Map<string, { severity: string; ruleCode: string }[]>();
  for (const f of flags as { recordId: string; severity: string; ruleCode: string }[]) (flagsBy.get(f.recordId) ?? flagsBy.set(f.recordId, []).get(f.recordId)!).push(f);
  const inputs: RiskInput[] = (insts as any[]).map((i) => {
    const rs = (recs as any[]).filter((r) => r.institutionId === i.id);
    const all: Record<string, number> = {};
    rs.forEach((r) => (all[r.admissionYear] = (all[r.admissionYear] ?? 0) + 1));
    const full = Object.fromEntries(Object.entries(all).filter(([, n]) => n >= 0.5 * i.approvedIntakeTotal));
    const open = (r: any) => flagsBy.get(r.id) ?? [];
    return { id: i.id, state: i.state, type: i.type, approvedTotal: i.approvedIntakeTotal, enrolledByYear: Object.keys(full).length ? full : all, totalRecords: rs.length || 1,
      flaggedRecords: rs.filter((r) => open(r).some((f) => f.severity !== 'INFO')).length,
      invalidApaarRecords: rs.filter((r) => open(r).some((f) => f.ruleCode === 'APAAR_FORMAT_INVALID' || f.ruleCode === 'APAAR_MISSING')).length };
  });
  const now = new Date();
  for (const r of computeRiskScores(inputs)) {
    const data = { score: r.score, factorsJson: JSON.stringify(r.factors), explanation: r.explanation, computedAt: now };
    await prisma.riskScore.upsert({ where: { institutionId: r.institutionId }, update: data, create: { institutionId: r.institutionId, ...data } });
  }
}
