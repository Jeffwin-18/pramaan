import { clientIp, writeAudit } from '@/lib/audit';
import { requireApi, scopeInstitution } from '@/lib/auth';
import { ist } from '@/lib/format';
import { renderSummary } from '@/lib/pdf/summary';
import { getOverview } from '@/lib/stats';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = await requireApi(['AICTE_ADMIN', 'AUDITOR', 'INSTITUTION_ADMIN']);
  if ('error' in g) return g.error;
  const o = await getOverview({ institutionId: scopeInstitution(g.user) });
  const pdf = await renderSummary({ generatedAt: ist(new Date()), year: o.year, scope: scopeInstitution(g.user) ? o.stats[0]?.name ?? 'Institution' : 'National view', kpi: o.kpi, states: o.states, risk: o.stats.map((s) => ({ name: s.name, state: s.state, score: s.risk, why: s.riskExplanation })), rules: o.rules });
  await writeAudit({ actorUserId: g.user.id, actorRole: g.user.role, action: 'REPORT_EXPORT', entityType: 'Report', entityId: 'summary-report', after: { format: 'pdf' }, ip: clientIp(req) });
  return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="summary-report.pdf"' } });
}
