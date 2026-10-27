import { writeFileSync } from 'fs';
import { renderCertificate } from '../lib/pdf/certificate';
import { qrDataUrl } from '../lib/verify';
(async () => {
  const url = 'http://localhost:3000/c/abc123def456abc123def456';
  const buf = await renderCertificate({ holder: 'Aditi Raman', apaarId: '384759201648', institution: 'Kaveri School of Engineering, Coimbatore', course: 'B.E. Computer Science and Engineering', year: '2025-26', status: 'VERIFIED', purpose: 'employment', verifiedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 864e5), verifier: 'Meera Nambiar', organisation: 'Talentbridge Staffing (demo employer)', url, token: 'abc123def456abc123def456', qr: await qrDataUrl(url) });
  writeFileSync('/tmp/cert.pdf', buf); console.log('pdf bytes', buf.length, buf.subarray(0, 5).toString());
})();
