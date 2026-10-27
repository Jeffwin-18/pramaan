'use client';
import { useState } from 'react';
import { Badge, MockBadge, STATUS_TONE, type Tone } from '@/components/ui/Badge';
import { validateApaar } from '@/lib/apaar';
import { ist, shortName } from '@/lib/format';

interface Audit { id: string; action: string; actorRole: string; entityType: string; entityId: string; createdAt: string; ip: string }
interface Result { found: boolean; token?: string; url?: string; qr?: string; abc?: { status: string }; card?: { holder: string; apaarId: string; institution: string; course: string; year: string; status: string }; consent?: { id: string; purpose: string; grantedAt: string; expiresAt: string }; audit: Audit }
interface Recent { id: string; apaar: string; purpose: string; at: string; token: string; holder: string | null }

export default function VerifyPortal({ who, recent }: { who: string; recent: Recent[] }) {
  const [apaar, setApaar] = useState('');
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const live = apaar.trim() ? validateApaar(apaar) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setRes(null);
    try {
      const r = await fetch('/api/v1/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apaarId: apaar, purpose, reason, consent }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRes(j);
    } catch (err) { setError((err as Error).message || 'Could not complete verification. Retry.'); }
    setBusy(false);
  }
  const c = res?.card; const ok = c?.status === 'VERIFIED';
  const sealTone = ok ? 'border-ok text-ok' : c?.status === 'REJECTED' ? 'border-bad text-bad' : 'border-warn text-warn';

  return (
    <div className="max-w-[1100px]">
      <h1 className="text-lg font-semibold">Verification portal</h1>
      <p className="text-sm text-muted mt-1">Verify one APAAR ID at a time. Each request records your consent declaration and writes an audit entry under {who}.</p>

      <form onSubmit={submit} className="mt-4 border border-line bg-surface rounded p-4 grid grid-cols-[260px_200px_1fr] gap-4 items-start">
        <label className="flex flex-col gap-1 text-sm font-medium">APAAR ID
          <input className="h-8 px-2 border border-line rounded bg-paper font-mono tracking-wider" inputMode="numeric" maxLength={14} placeholder="12 digits" value={apaar} onChange={(e) => setApaar(e.target.value.replace(/\s/g, ''))} />
          <span className="text-[11px] font-normal text-muted flex items-center gap-1 h-4">{live ? <>Format {live.formatOk ? '✓' : '✗'} · Checksum (mock) {live.checksumOk === null ? 'n/a' : live.checksumOk ? '✓' : '✗'} <MockBadge /></> : 'Format and checksum (mock) shown as you type'}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">Purpose
          <select className="h-8 px-2 border border-line rounded bg-paper font-normal" value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">Select</option><option value="employment">Employment</option><option value="admission">Admission</option><option value="regulatory">Regulatory</option></select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">Reason, optional
          <input className="h-8 px-2 border border-line rounded bg-paper font-normal" maxLength={300} placeholder="Reference or case number" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label className="col-span-3 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I confirm the student has given consent for this verification and for the purpose selected above. I understand this request is recorded against my account.</span>
        </label>
        <div className="col-span-3 flex items-center gap-3"><button className="btn btn-primary" disabled={busy || !live?.formatOk || !live.checksumOk || !purpose || !consent}>{busy ? 'Verifying' : 'Verify'}</button><span className="text-xs text-muted">Limit 20 verifications per hour. No bulk lookup. No PII export.</span></div>
      </form>

      {error && <p role="alert" className="mt-3 text-bad border border-bad/40 bg-bad/5 rounded px-3 py-2">{error}</p>}
      {busy && <div className="mt-4 border border-line bg-surface rounded p-4 space-y-2">{[240, 180, 300, 200].map((w, i) => <div key={i} className="h-3 rounded-sm bg-line animate-pulse" style={{ width: w }} />)}</div>}

      {res && !res.found && <p className="mt-4 border border-line bg-surface rounded px-4 py-3 text-sm">No record found for this APAAR ID. The lookup was logged.</p>}

      {res?.found && c && (
        <section className="mt-4 border border-line bg-surface rounded">
          <div className="grid grid-cols-[1fr_auto]">
            <div className="p-4">
              <div className={`inline-block border-2 px-3 py-1 font-semibold tracking-[0.12em] text-sm ${sealTone}`}>{ok ? 'VERIFIED' : c.status === 'REJECTED' ? 'REJECTED' : 'UNDER REVIEW'}</div>
              <dl className="mt-3 grid grid-cols-[130px_1fr] gap-y-1.5 text-sm">
                <dt className="text-muted">Student</dt><dd className="font-semibold">{c.holder}</dd>
                <dt className="text-muted">APAAR ID</dt><dd className="font-mono text-xs">{c.apaarId}<span className="ml-2 text-[11px] text-muted">Format ✓ · Checksum (mock) ✓</span></dd>
                <dt className="text-muted">Institution</dt><dd>{c.institution}</dd><dt className="text-muted">Course</dt><dd>{c.course}</dd><dt className="text-muted">Admission year</dt><dd className="font-mono text-xs">{c.year}</dd>
                <dt className="text-muted">Record status</dt><dd><Badge tone={STATUS_TONE[c.status] as Tone}>{c.status}</Badge></dd>
                <dt className="text-muted">ABC / DigiLocker</dt><dd className="flex items-center gap-2">{res.abc?.status === 'LINKED' ? 'Linked' : 'Not linked'} <MockBadge /></dd>
              </dl>
              {!ok && <p className="mt-3 text-sm text-warn">This record has open flags or is awaiting review. It is not confirmed as verified.</p>}
              <a className="btn btn-primary mt-4" href={`/api/v1/verify/${res.token}/certificate`}>Download certificate PDF</a>
            </div>
            <div className="p-4 border-l border-line text-center"><img src={res.qr} alt="QR code for the certificate check page" width={168} height={168} className="border border-line" /><div className="mt-1 text-[11px] text-muted">Scan to check certificate</div><div className="font-mono text-[10px] text-muted max-w-[168px] break-all">{res.url}</div></div>
          </div>
        </section>)}

      {res && (
        <section className="mt-4 border border-line bg-surface rounded">
          <div className="px-4 py-2 border-b border-line flex items-center gap-2"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Audit entry written</h2><Badge tone="ok">Logged</Badge></div>
          <table className="w-full text-sm"><thead><tr><th className="th">Audit ID</th><th className="th">Action</th><th className="th">Actor role</th><th className="th">Entity</th><th className="th">Time</th><th className="th">IP</th></tr></thead>
            <tbody><tr><td className="td font-mono text-xs">{res.audit.id}</td><td className="td font-mono text-xs">{res.audit.action}</td><td className="td">{res.audit.actorRole}</td><td className="td font-mono text-xs">{res.audit.entityType} {res.audit.entityId}</td><td className="td whitespace-nowrap">{ist(res.audit.createdAt)}</td><td className="td font-mono text-xs">{res.audit.ip}</td></tr></tbody></table>
          {res.consent && <div className="px-4 py-2 border-t border-line text-sm text-muted">Consent <span className="font-mono text-xs text-ink">{res.consent.id}</span>, purpose {res.consent.purpose}, granted {ist(res.consent.grantedAt)}, valid until {ist(res.consent.expiresAt)}.</div>}
        </section>)}

      <h2 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Your recent verifications</h2>
      <div className="border border-line bg-surface rounded"><table className="w-full text-sm"><thead><tr><th className="th">When</th><th className="th">APAAR ID</th><th className="th">Purpose</th><th className="th"></th></tr></thead>
        <tbody>{recent.length === 0 && <tr><td className="td text-muted" colSpan={4}>No verifications yet. Enter an APAAR ID above.</td></tr>}
          {recent.map((r) => <tr key={r.id} className="hover:bg-paper"><td className="td whitespace-nowrap">{ist(r.at)}</td><td className="td font-mono text-xs">{r.apaar}</td><td className="td">{r.purpose}</td><td className="td text-right"><a className="underline text-accent" href={`/api/v1/verify/${r.token}/certificate`}>Certificate PDF</a></td></tr>)}</tbody></table></div>
    </div>
  );
}
