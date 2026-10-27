// Verification certificate PDF. Uses createElement (no JSX) so it also runs under tsx for testing.
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';

const h = React.createElement as any;
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#16191D', backgroundColor: '#FFFFFF' },
  head: { borderBottomWidth: 2, borderBottomColor: '#1F3A5F', paddingBottom: 8, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1F3A5F' }, sub: { fontSize: 9, color: '#5D636B', marginTop: 2 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E3E1DC', paddingVertical: 6 },
  k: { width: 130, color: '#5D636B', fontSize: 9, textTransform: 'uppercase' }, v: { flex: 1, fontSize: 11 }, mono: { fontFamily: 'Courier', fontSize: 10 },
  seal: { borderWidth: 2, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 14, fontFamily: 'Helvetica-Bold', fontSize: 13, letterSpacing: 1.5 },
  foot: { position: 'absolute', left: 40, right: 40, bottom: 30, fontSize: 8, color: '#5D636B', borderTopWidth: 1, borderTopColor: '#E3E1DC', paddingTop: 6 },
});
const fmt = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST';
const Row = (k: string, v: string, mono = false) => h(View, { style: s.row, key: k }, h(Text, { style: s.k }, k), h(Text, { style: [s.v, mono ? s.mono : {}] }, v));

export interface CertInput { holder: string; apaarId: string; institution: string; course: string; year: string; status: string; purpose: string; verifiedAt: Date; expiresAt: Date; verifier: string; organisation: string | null; url: string; token: string; qr: string }

export async function renderCertificate(d: CertInput): Promise<Buffer> {
  const ok = d.status === 'VERIFIED';
  const colour = ok ? '#1E7A4C' : d.status === 'REJECTED' ? '#B42318' : '#B7791F';
  const label = ok ? 'VERIFIED' : d.status === 'REJECTED' ? 'REJECTED' : 'UNDER REVIEW';
  return renderToBuffer(h(Document, { title: 'APAAR Verification Certificate' },
    h(Page, { size: 'A4', style: s.page },
      h(View, { style: s.head }, h(Text, { style: s.title }, 'Student Record Verification Certificate'), h(Text, { style: s.sub }, 'APAAR ID based verification, AICTE-approved institutions. Prototype build, synthetic data.')),
      h(Text, { style: [s.seal, { color: colour, borderColor: colour }] }, label),
      Row('Student', d.holder), Row('APAAR ID', d.apaarId, true), Row('Institution', d.institution), Row('Course', d.course), Row('Admission year', d.year, true), Row('Record status', d.status),
      Row('Format / checksum', 'Format pass. Checksum (mock) pass.'), Row('ABC / DigiLocker', 'MOCK result. No live service was called.'),
      Row('Purpose', d.purpose), Row('Requested by', `${d.verifier}${d.organisation ? `, ${d.organisation}` : ''}`), Row('Verified on', fmt(d.verifiedAt)), Row('Consent valid until', fmt(d.expiresAt)),
      h(View, { style: { flexDirection: 'row', marginTop: 20, alignItems: 'center' } },
        h(Image, { src: d.qr, style: { width: 110, height: 110 } }),
        h(View, { style: { marginLeft: 14, flex: 1 } }, h(Text, { style: { fontSize: 9, color: '#5D636B' } }, 'Scan to check this certificate'), h(Text, { style: [s.mono, { fontSize: 8, marginTop: 3 }] }, d.url), h(Text, { style: { fontSize: 8, color: '#5D636B', marginTop: 6 } }, `Certificate reference ${d.token}`))),
      h(Text, { style: s.foot }, 'Prototype for SIH 2026 (SIH26263, Team Deep Thinkers). All institutions and students are fictional. Checksum and ABC / DigiLocker results are simulated. Not an official document.'))));
}
