import { NextResponse } from 'next/server';
import { clientIp, writeAudit } from '@/lib/audit';
import { requireApi } from '@/lib/auth';
import { renderCertificate } from '@/lib/pdf/certificate';
import { loadCertificate, originOf, qrDataUrl } from '@/lib/verify';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const g = await requireApi(['VERIFIER', 'AICTE_ADMIN']);
  if ('error' in g) return g.error;
  const c = await loadCertificate(params.token, originOf(req));
  if (!c || (g.user.role === 'VERIFIER' && c.verifierUserId !== g.user.id)) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
  const pdf = await renderCertificate({ ...c, qr: await qrDataUrl(c.url) });
  await writeAudit({ actorUserId: g.user.id, actorRole: g.user.role, action: 'CERTIFICATE_DOWNLOAD', entityType: 'Consent', entityId: c.consentId, ip: clientIp(req) });
  return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="verification_${c.apaarId.slice(0, 4)}xxxx_${c.token.slice(0, 6)}.pdf"` } });
}
