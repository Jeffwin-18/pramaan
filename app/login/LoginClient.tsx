'use client';
import { useState } from 'react';

const ROLES = [
  { role: 'AICTE_ADMIN', name: 'AICTE Admin', scope: 'National view. All institutions, flags, risk scores, reports and the audit log.', demo: 'Demo as AICTE Admin' },
  { role: 'INSTITUTION_ADMIN', name: 'Institution Admin', scope: 'Own institution only. Upload admission data, work own flags, view own dashboard.', demo: 'Demo as Institution' },
  { role: 'VERIFIER', name: 'Verifier', scope: 'Employer or regulator. Verify one APAAR ID at a time with recorded consent and purpose. No browsing, no PII export.', demo: 'Demo as Verifier' },
  { role: 'AUDITOR', name: 'Auditor', scope: 'Read-only across all data including the audit trail.', demo: 'Demo as Auditor' },
];

export default function LoginClient({ demo }: { demo: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(payload: object, key: string) {
    setBusy(key); setError(null);
    try {
      const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Sign in failed.');
      window.location.href = j.redirect;
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-11 border-b border-line bg-surface flex items-center px-5 gap-3">
        <span className="font-semibold tracking-tight">APAAR Verification Platform</span>
        <span className="text-muted text-sm">Student data management and verification for AICTE-approved institutions</span>
        <span className="ml-auto badge text-saffron border-saffron/50 bg-saffron/10">Prototype</span>
      </header>
      <main className="flex-1 px-5 py-8 max-w-[880px] w-full">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-muted mt-1">Select a role. Demo accounts open without a password.</p>

        <div className="mt-5 border border-line bg-surface rounded">
          {ROLES.map((r, i) => (
            <div key={r.role} className={`flex items-center gap-4 px-4 py-3 ${i ? 'border-t border-line' : ''}`}>
              <div className="w-44 shrink-0">
                <div className="font-semibold">{r.name}</div>
                <div className="font-mono text-[11px] text-muted">{r.role}</div>
              </div>
              <p className="flex-1 text-muted">{r.scope}</p>
              <button className="btn btn-primary shrink-0 w-44" disabled={!demo || busy !== null} onClick={() => submit({ demo: r.role }, r.role)} title={demo ? undefined : 'Demo login is disabled on this server'}>
                {busy === r.role ? 'Signing in' : r.demo}
              </button>
            </div>
          ))}
        </div>
        {!demo && <p className="mt-2 text-sm text-muted">Demo login is disabled on this server. Use an account email and password.</p>}

        <details className="mt-6 border border-line bg-surface rounded">
          <summary className="px-4 py-2.5 cursor-pointer font-medium">Sign in with email and password</summary>
          <form className="px-4 pb-4 pt-1 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); submit({ email, password }, 'form'); }}>
            <label className="flex flex-col gap-1 text-sm">Email
              <input className="h-8 w-64 px-2 border border-line rounded bg-paper font-mono text-sm" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </label>
            <label className="flex flex-col gap-1 text-sm">Password
              <input type="password" className="h-8 w-48 px-2 border border-line rounded bg-paper text-sm" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
            <button className="btn btn-primary" disabled={busy !== null || !email || !password}>{busy === 'form' ? 'Signing in' : 'Sign in'}</button>
          </form>
        </details>

        {error && <p role="alert" className="mt-4 text-bad border border-bad/40 bg-bad/5 rounded px-3 py-2">{error}</p>}
        <p className="mt-8 text-xs text-muted">All institutions and students in this system are fictional. Data is synthetic for demonstration. ABC / DigiLocker results and the APAAR checksum are simulated and marked Mock.</p>
      </main>
    </div>
  );
}
