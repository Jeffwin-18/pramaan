import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { verifyWithAbc } from '@/lib/abc';
import { clientIp, writeAudit } from '@/lib/audit';
import { requireApi } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { refreshRiskScores } from '@/lib/risk-db';
import { loadValidationContext, YEARS } from '@/lib/upload/db';
import { validateBatch } from '@/lib/upload/validate';

export const dynamic = 'force-dynamic';
const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

// Re-validates on the server (the client preview is never trusted), then stores the batch.
// Policy: rows that cannot be parsed are rejected. Every other row is stored; rows with a BLOCKER or
// WARNING flag are stored as FLAGGED and queued for human review. Nothing is auto-rejected on a match.
export async function POST(req: Request) {
  const g = await requireApi(['INSTITUTION_ADMIN']);
  if ('error' in g) return g.error;
  const { courseId, admissionYear, rows, fileName } = await req.json().catch(() => ({}));
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000) return NextResponse.json({ error: 'Provide between 1 and 2000 rows.' }, { status: 400 });
  if (!YEARS.includes(admissionYear)) return NextResponse.json({ error: 'Unknown admission year.' }, { status: 400 });
  const institutionId = g.user.institutionId!;
  const ctx = await loadValidationContext(institutionId, courseId, admissionYear);
  if (!ctx) return NextResponse.json({ error: 'Course does not belong to your institution.' }, { status: 403 });

  const { results, summary } = validateBatch({ rows, institutionId, year: admissionYear, ...ctx, newId: () => uid('rec') });
  const stored = results.filter((r) => r.record);
  const batchId = uid('bat');
  const now = new Date();
  const statusOf = async (r: (typeof stored)[number]) => {
    const blocking = r.flags.some((f) => f.severity !== 'INFO');
    const abc = r.record!.apaarId ? await verifyWithAbc(r.record!.apaarId) : null; // MOCK
    return !blocking && abc?.status === 'LINKED' ? 'VERIFIED' : 'FLAGGED';
  };
  const statuses = await Promise.all(stored.map(statusOf));
  const flagRows = stored.flatMap((r) => r.flags.map((f) => ({ id: uid('flg'), recordId: r.record!.id, institutionId, ruleCode: f.ruleCode, severity: f.severity, message: f.message, explanation: f.explanation, suggestedFix: f.suggestedFix, confidence: f.confidence, relatedRecordId: f.relatedRecordId ?? null, status: 'OPEN', createdAt: now })));
  const safeName = String(fileName ?? 'pasted_rows.csv').replace(/[^\w.\- ]/g, '_').slice(0, 120);

  await prisma.$transaction([
    prisma.uploadBatch.create({ data: { id: batchId, institutionId, admissionYear, uploadedById: g.user.id, fileName: safeName, rowCount: summary.total, acceptedCount: stored.length, rejectedCount: summary.unparseable, flaggedCount: summary.flagged, status: 'COMMITTED', createdAt: now } }),
    prisma.studentRecord.createMany({ data: stored.map((r, i) => ({ ...r.record!, uploadBatchId: batchId, status: statuses[i], createdAt: now, updatedAt: now })) }),
    prisma.recordVersion.createMany({ data: stored.map((r) => ({ id: uid('ver'), recordId: r.record!.id, version: 1, changedById: g.user.id, changedAt: now, diffJson: JSON.stringify({ record: { from: null, to: `created via ${batchId}` } }) })) }),
    prisma.flag.createMany({ data: flagRows }),
  ]);
  await writeAudit({ actorUserId: g.user.id, actorRole: g.user.role, action: 'UPLOAD_COMMIT', entityType: 'UploadBatch', entityId: batchId, after: { fileName: safeName, courseId, year: admissionYear, rows: summary.total, accepted: stored.length, rejected: summary.unparseable, flagged: summary.flagged, flagsRaised: flagRows.length }, ip: clientIp(req) });
  await refreshRiskScores().catch(() => {});
  return NextResponse.json({ batchId, accepted: stored.length, rejected: summary.unparseable, flagged: summary.flagged, flagsRaised: flagRows.length, verified: statuses.filter((s) => s === 'VERIFIED').length });
}
