import { NextResponse } from 'next/server';
import { clientIp, writeAudit } from '@/lib/audit';
import { requireApi } from '@/lib/auth';
import { loadValidationContext, YEARS } from '@/lib/upload/db';
import { stripForPreview, validateBatch } from '@/lib/upload/validate';

export const dynamic = 'force-dynamic';

// Dry run. Nothing is written except an audit row.
export async function POST(req: Request) {
  const g = await requireApi(['INSTITUTION_ADMIN']);
  if ('error' in g) return g.error;
  const { courseId, admissionYear, rows } = await req.json().catch(() => ({}));
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000) return NextResponse.json({ error: 'Provide between 1 and 2000 rows.' }, { status: 400 });
  if (!YEARS.includes(admissionYear)) return NextResponse.json({ error: 'Unknown admission year.' }, { status: 400 });
  const ctx = await loadValidationContext(g.user.institutionId!, courseId, admissionYear);
  if (!ctx) return NextResponse.json({ error: 'Course does not belong to your institution.' }, { status: 403 });
  const { results, summary } = validateBatch({ rows, institutionId: g.user.institutionId!, year: admissionYear, ...ctx });
  await writeAudit({ actorUserId: g.user.id, actorRole: g.user.role, action: 'UPLOAD_VALIDATE', entityType: 'Course', entityId: courseId, after: { year: admissionYear, ...summary }, ip: clientIp(req) });
  return NextResponse.json({ summary, results: stripForPreview(results) });
}
