import { NextResponse } from 'next/server';
import { verifyWithAbc } from '@/lib/abc';
import { validateApaar } from '@/lib/apaar';
import { clientIp, writeAudit } from '@/lib/audit';
import { requireApi } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PURPOSES, maskApaar, newToken, originOf, qrDataUrl, verifyUrl } from '@/lib/verify';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
const HOURLY_LIMIT = 20; // verifiers cannot sweep the register

export async function POST(req: Request) {
  const g = await requireApi(['VERIFIER', 'AICTE_ADMIN']);
  if ('error' in g) return g.error;
  const { apaarId: raw, purpose, reason, consent } = await req.json().catch(() => ({}));
  const apaarId = String(raw ?? '').trim();
  if (!PURPOSES.includes(purpose)) return NextResponse.json({ error: 'Select a purpose: employment, admission or regulatory.' }, { status: 400 });
  if (consent !== true) return NextResponse.json({ error: 'Confirm that the student has consented to this verification.' }, { status: 400 });
  const ip = clientIp(req), base = { actorUserId: g.user.id, actorRole: g.user.role, ip };

  const recent = await prisma.auditLog.count({ where: { actorUserId: g.user.id, action: { in: ['VERIFY_RECORD', 'VERIFY_NOT_FOUND', 'VERIFY_INVALID_ID'] }, createdAt: { gt: new Date(Date.now() - 3600000) } } });
  if (recent >= HOURLY_LIMIT) return NextResponse.json({ error: `Limit of ${HOURLY_LIMIT} verifications per hour reached.` }, { status: 429 });

  const chk = validateApaar(apaarId);
  if (!chk.formatOk || !chk.checksumOk) {
    await writeAudit({ ...base, action: 'VERIFY_INVALID_ID', entityType: 'ApaarId', entityId: maskApaar(apaarId), after: { purpose, reasons: chk.reasons } });
    return NextResponse.json({ error: `APAAR ID ${chk.reasons.join('; ')}.` }, { status: 422 });
  }
  const rec: any = await prisma.studentRecord.findFirst({ where: { apaarId, status: { not: 'REJECTED' } }, orderBy: { admissionYear: 'desc' }, include: { institution: { select: { name: true } }, course: { select: { name: true } } } });
  if (!rec) {
    const a = await writeAudit({ ...base, action: 'VERIFY_NOT_FOUND', entityType: 'ApaarId', entityId: maskApaar(apaarId), after: { purpose } });
    return NextResponse.json({ found: false, audit: { id: a.id, action: a.action, actorRole: a.actorRole, entityType: a.entityType, entityId: a.entityId, createdAt: a.createdAt, ip: a.ip } });
  }
  const now = new Date(), token = newToken();
  const consentRow = await prisma.consent.create({ data: { id: `con_${randomUUID().slice(0, 12)}`, token, apaarId, verifierUserId: g.user.id, purpose, reason: reason ? String(reason).slice(0, 300) : null, grantedAt: now, expiresAt: new Date(now.getTime() + 30 * 86400000), recordId: rec.id } });
  const a = await writeAudit({ ...base, action: 'VERIFY_RECORD', entityType: 'Consent', entityId: consentRow.id, after: { apaarId: maskApaar(apaarId), purpose, reason: consentRow.reason, consent: true, recordStatus: rec.status } });
  const url = verifyUrl(originOf(req), token);
  return NextResponse.json({
    found: true, token, url, qr: await qrDataUrl(url), abc: await verifyWithAbc(apaarId), // MOCK
    card: { holder: rec.fullName, apaarId, institution: rec.institution.name, course: rec.course.name, year: rec.admissionYear, status: rec.status },
    consent: { id: consentRow.id, purpose, grantedAt: consentRow.grantedAt, expiresAt: consentRow.expiresAt },
    audit: { id: a.id, action: a.action, actorRole: a.actorRole, entityType: a.entityType, entityId: a.entityId, createdAt: a.createdAt, ip: a.ip },
  });
}
