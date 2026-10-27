import { requireApi } from '@/lib/auth';
import { sampleCsv } from '@/lib/upload/demo';
export const dynamic = 'force-dynamic';
export async function GET() {
  const g = await requireApi(['INSTITUTION_ADMIN']);
  if ('error' in g) return g.error;
  return new Response(sampleCsv(), { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="sample_admissions.csv"' } });
}
