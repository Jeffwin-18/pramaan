import { createHash, randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { writeAudit } from './audit';
import { prisma } from './db';

export const PURPOSES = ['employment', 'admission', 'regulatory'] as const;
export const maskApaar = (a: string) => (a.length >= 8 ? `${a.slice(0, 4)}****${a.slice(-4)}` : '****');
export const maskName = (n: string) => n.split(' ').map((t, i, a) => (i === 0 ? t : i === a.length - 1 ? `${t[0]}.` : `${t[0]}.`)).join(' ');
export const newToken = () => randomBytes(12).toString('hex');
export const originOf = (req: Request) => process.env.APP_URL ?? new URL(req.url).origin;
export const verifyUrl = (origin: string, token: string) => `${origin}/c/${token}`;
export const qrDataUrl = (url: string) => QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#16191D', light: '#FFFFFF' } });
export const fingerprintShort = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 8);

export interface CertData { token: string; holder: string; apaarId: string; institution: string; course: string; year: string; status: string; purpose: string; verifiedAt: Date; expiresAt: Date; verifier: string; organisation: string | null; url: string }

export async function loadCertificate(token: string, origin: string): Promise<(CertData & { consentId: string; verifierUserId: string }) | null> {
  const c: any = await prisma.consent.findUnique({ where: { token }, include: { verifier: { select: { name: true, organisation: true } } } });
  if (!c || !c.recordId) return null;
  const r: any = await prisma.studentRecord.findUnique({ where: { id: c.recordId }, include: { institution: { select: { name: true } }, course: { select: { name: true } } } });
  if (!r) return null;
  return { token, consentId: c.id, verifierUserId: c.verifierUserId, holder: r.fullName, apaarId: c.apaarId, institution: r.institution.name, course: r.course.name, year: r.admissionYear, status: r.status, purpose: c.purpose, verifiedAt: c.grantedAt, expiresAt: c.expiresAt, verifier: c.verifier.name, organisation: c.verifier.organisation, url: verifyUrl(origin, token) };
}

// Public lookup behind the QR code. Returns masked details only, and logs the view.
export async function publicLookup(token: string, ip: string) {
  const c = await loadCertificate(token, '');
  await writeAudit({ actorUserId: null, actorRole: 'PUBLIC', action: 'VERIFY_LINK_VIEW', entityType: 'Consent', entityId: c?.consentId ?? token.slice(0, 24), after: { found: !!c }, ip });
  if (!c) return null;
  return { holder: maskName(c.holder), apaarId: maskApaar(c.apaarId), institution: c.institution, course: c.course, year: c.year, status: c.status, purpose: c.purpose, verifiedAt: c.verifiedAt.toISOString(), expiresAt: c.expiresAt.toISOString(), expired: c.expiresAt.getTime() < Date.now() };
}
