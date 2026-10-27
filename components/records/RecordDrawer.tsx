'use client';
import { useEffect, useState } from 'react';
import { Badge, MockBadge, SEVERITY_TONE, STATUS_TONE, type Tone } from '@/components/ui/Badge';
import { validateApaar } from '@/lib/apaar';
import { ist, shortName } from '@/lib/format';

interface Detail {
  record: { id: string; apaarId: string | null; fullName: string; dob: string; gender: string; category: string; isNRI: boolean; isOCI: boolean; isForeignNational: boolean; admissionYear: string; admissionType: string; status: string; fingerprint: string; institution: { name: string }; course: string; uploadBatchId: string | null };
  flags: { id: string; ruleCode: string; severity: string; status: string; explanation: string; confidence: number | null }[];
  versions: { version: number; changedAt: string; changedBy: { name: string; email: string } | null; diff: Record<string, { from: unknown; to: unknown }> }[];
}
const LABEL: Record<string, string> = { apaarId: 'APAAR ID', fullName: 'Name', status: 'Status', category: 'Category', dob: 'Date of birth', admissionType: 'Admission type' };
const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mt-5 mb-2">{children}</h3>;

export default function RecordDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    setD(null); setErr(false);
    fetch(`/api/v1/records/${id}`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setD).catch(() => setErr(true));
  }, [id]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const r = d?.record;
  const chk = r?.apaarId ? validateApaar(r.apaarId) : null;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label="Student record" className="fixed top-0 right-0 bottom-0 z-40 w-[500px] bg-surface border-l border-line overflow-auto">
        <div className="sticky top-0 bg-surface border-b border-line px-4 h-11 flex items-center gap-3">
          <span className="font-semibold truncate">{r?.fullName ?? 'Student record'}</span>
          {r && <Badge tone={STATUS_TONE[r.status] as Tone}>{r.status}</Badge>}
          <button className="btn ml-auto" onClick={onClose}>Close <span className="kbd">Esc</span></button>
        </div>
        <div className="px-4 pb-8">
          {err && <p className="mt-4 text-bad">Could not load this record. <button className="underline" onClick={() => { setErr(false); fetch(`/api/v1/records/${id}`).then((x) => x.json()).then(setD).catch(() => setErr(true)); }}>Retry</button></p>}
          {!d && !err && <div className="mt-4 space-y-2">{[200, 150, 260, 180, 220, 140].map((w, i) => <div key={i} className="h-3 rounded-sm bg-line animate-pulse" style={{ width: w }} />)}</div>}
          {d && r && (<>
            <H>Record</H>
            <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
              <dt className="text-muted">APAAR ID</dt>
              <dd><span className="font-mono text-xs">{r.apaarId ?? 'missing'}</span>{chk && <div className="text-[10px] text-muted flex items-center gap-1">Format {chk.formatOk ? '✓' : '✗'} · Checksum (mock) {chk.checksumOk === null ? 'n/a' : chk.checksumOk ? '✓' : '✗'} <MockBadge /></div>}</dd>
              <dt className="text-muted">Date of birth</dt><dd className="font-mono text-xs">{r.dob.slice(0, 10)}</dd>
              <dt className="text-muted">Gender</dt><dd>{r.gender}</dd>
              <dt className="text-muted">Category</dt><dd className="font-mono text-xs">{r.category}</dd>
              <dt className="text-muted">Institution</dt><dd>{shortName(r.institution.name)}</dd>
              <dt className="text-muted">Course</dt><dd>{r.course}</dd>
              <dt className="text-muted">Admission</dt><dd><span className="font-mono text-xs">{r.admissionYear}</span>, {r.admissionType}{(r.isNRI || r.isOCI || r.isForeignNational) && <> ({[r.isNRI && 'NRI', r.isOCI && 'OCI', r.isForeignNational && 'FN'].filter(Boolean).join(', ')})</>}</dd>
              <dt className="text-muted">Fingerprint</dt>
              <dd><span className="font-mono text-xs cursor-help border-b border-dotted border-muted" title="One-way hash. No Aadhaar stored.">{r.fingerprint.slice(0, 12)}…{r.fingerprint.slice(-6)}</span><div className="text-[10px] text-muted">One-way hash. No Aadhaar stored.</div></dd>
            </dl>

            <H>Flags ({d.flags.length})</H>
            {d.flags.length === 0 ? <p className="text-sm text-muted">No flags on this record.</p> : d.flags.map((f) => (
              <div key={f.id} className="border border-line rounded px-3 py-2 mb-2 text-sm">
                <div className="flex items-center gap-2"><Badge tone={SEVERITY_TONE[f.severity] as Tone}>{f.severity}</Badge><span className="font-mono text-xs">{f.ruleCode}</span>
                  {f.confidence != null && <span className="text-xs text-muted">conf {f.confidence.toFixed(2)}</span>}<span className="ml-auto"><Badge tone={f.status === 'RESOLVED' ? 'ok' : f.status === 'ESCALATED' ? 'saffron' : 'neutral'}>{f.status}</Badge></span></div>
                <p className="mt-1 text-muted">{f.explanation}</p>
              </div>))}

            <H>Version history</H>
            <ol className="relative ml-2 border-l border-line pl-5 space-y-4">
              {d.versions.map((v) => (
                <li key={v.version} className="relative">
                  <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-sm bg-surface border-2 border-accent" />
                  <div className="flex items-baseline gap-2"><span className="font-mono text-xs font-semibold">v{v.version}</span><span className="text-xs text-muted">{ist(v.changedAt)}</span></div>
                  <div className="text-xs text-muted">Changed by: <span className="font-mono">{v.changedBy?.email ?? 'system'}</span> · {ist(v.changedAt)}</div>
                  <div className="mt-1.5 space-y-1">
                    {Object.entries(v.diff).map(([k, c]) => k === 'record'
                      ? <div key={k} className="text-sm">Record created. <span className="text-muted">{String(c.to).replace('created via ', 'Batch ')}</span></div>
                      : <div key={k} className="grid grid-cols-[96px_1fr] text-sm items-baseline gap-2"><span className="text-muted">{LABEL[k] ?? k}</span>
                          <span className="font-mono text-xs"><span className="text-bad line-through">{String(c.from ?? 'empty')}</span> <span className="text-muted">to</span> <span className="text-ok">{String(c.to ?? 'empty')}</span></span></div>)}
                  </div>
                </li>))}
            </ol>
          </>)}
        </div>
      </aside>
    </>
  );
}
