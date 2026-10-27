import { requireApi } from '@/lib/auth';
import { csvResponse, flagReportRows } from '@/lib/reports';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const g = await requireApi(['AICTE_ADMIN', 'AUDITOR', 'INSTITUTION_ADMIN']);
  if ('error' in g) return g.error;
  return csvResponse(req, g.user, 'flags-report', await flagReportRows(g.user));
}
