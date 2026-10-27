import { headers } from 'next/headers';
import { Badge, STATUS_TONE, type Tone } from '@/components/ui/Badge';
import { ist, shortName } from '@/lib/format';
import { publicLookup } from '@/lib/verify';

export const dynamic = 'force-dynamic';

// Public certificate check (QR target). No sign-in. Shows masked details only.
export default async function Check({ params }: { params: { token: string } }) {
  const ip = headers().get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const r = await publicLookup(params.token, ip);
  return (
    <div className="min-h-screen">
      <header className="h-11 border-b border-line bg-surface flex items-center px-5 gap-3"><span className="font-semibold tracking-tight">APAAR Verification Platform</span><span className="ml-auto badge text-saffron border-saffron/50 bg-saffron/10">Prototype</span></header>
      <main className="px-5 py-6 max-w-[560px]">
        <h1 className="text-lg font-semibold">Certificate check</h1>
        {!r ? <p className="mt-3 border border-bad/40 bg-bad/5 text-bad rounded px-3 py-2">No certificate matches this reference.</p> : (
          <div className="mt-3 border border-line bg-surface rounded">
            <div className={`px-4 py-2 border-b border-line text-sm font-semibold ${r.expired ? 'text-warn' : r.status === 'VERIFIED' ? 'text-ok' : 'text-warn'}`}>{r.expired ? 'Certificate genuine, consent window expired' : r.status === 'VERIFIED' ? 'Certificate genuine. Record verified.' : 'Certificate genuine. Record is under review.'}</div>
            <dl className="px-4 py-3 grid grid-cols-[130px_1fr] gap-y-1.5 text-sm">
              <dt className="text-muted">Student</dt><dd>{r.holder}</dd><dt className="text-muted">APAAR ID</dt><dd className="font-mono text-xs">{r.apaarId}</dd>
              <dt className="text-muted">Institution</dt><dd>{shortName(r.institution)}</dd><dt className="text-muted">Course</dt><dd>{r.course}</dd><dt className="text-muted">Admission year</dt><dd className="font-mono text-xs">{r.year}</dd>
              <dt className="text-muted">Record status</dt><dd><Badge tone={STATUS_TONE[r.status] as Tone}>{r.status}</Badge></dd><dt className="text-muted">Purpose</dt><dd>{r.purpose}</dd>
              <dt className="text-muted">Verified on</dt><dd>{ist(r.verifiedAt)}</dd><dt className="text-muted">Valid until</dt><dd>{ist(r.expiresAt)}</dd>
            </dl>
          </div>)}
        <p className="mt-4 text-xs text-muted">Details are masked on this public page. This view was logged. Prototype with synthetic data. Checksum and ABC / DigiLocker results are simulated.</p>
      </main>
    </div>
  );
}
