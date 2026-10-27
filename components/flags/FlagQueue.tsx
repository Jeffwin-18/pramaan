'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, MockBadge, SEVERITY_TONE, STATUS_TONE, type Tone } from '@/components/ui/Badge';
import { validateApaar } from '@/lib/apaar';
import { istDate, ist, shortName } from '@/lib/format';
import type { Role } from '@/lib/roles';

interface FlagRow {
  id: string; ruleCode: string; severity: string; message: string; explanation: string; suggestedFix: string; confidence: number | null; status: string;
  createdAt: string; resolvedAt: string | null; resolutionNote: string | null; resolvedBy: string | null; institution: { id: string; name: string };
  record: { id: string; apaarId: string | null; fullName: string; dob: string; gender: string; category: string; admissionYear: string; admissionType: string; status: string; courseName: string } | null;
  related: { id: string; fullName: string; apaarId: string | null; admissionYear: string; institutionName: string } | null;
}
interface Data { rows: FlagRow[]; total: number; page: number; pageSize: number; tabs: Record<string, number>; lastScan: string | null }
interface Filters { status: string; rule: string; severity: string; institution: string; batch: string; q: string }

const TABS = [['OPEN', 'Open'], ['ESCALATED', 'Escalated'], ['RESOLVED', 'Resolved'], ['ALL', 'All']] as const;

export default function FlagQueue({ role, institutions, rules, initial }: { role: Role; institutions: { id: string; name: string }[]; rules: { code: string; label: string }[]; initial: Filters }) {
  const [f, setF] = useState<Filters>(initial);
  const [q, setQ] = useState(initial.q);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const readOnly = role === 'AUDITOR';

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    const p = new URLSearchParams({ status: f.status, page: String(page) });
    (['rule', 'severity', 'institution', 'batch'] as const).forEach((k) => f[k] && p.set(k, f[k]));
    if (q.trim()) p.set('q', q.trim());
    try {
      const r = await fetch(`/api/v1/flags?${p}`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch { setError(true); }
    setLoading(false);
  }, [f, page, q]);

  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);

  const set = (patch: Partial<Filters>) => { setF({ ...f, ...patch }); setPage(1); setSel(new Set()); setOpenId(null); };
  const canAct = (r: FlagRow) => !readOnly && r.status !== 'RESOLVED' && !(role === 'INSTITUTION_ADMIN' && r.status === 'ESCALATED');
  const actionable = useMemo(() => (data?.rows ?? []).filter(canAct), [data, role]); // eslint-disable-line react-hooks/exhaustive-deps
  const allSel = actionable.length > 0 && actionable.every((r) => sel.has(r.id));

  async function act(r: FlagRow, action: 'resolve' | 'escalate' | 'reject') {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/v1/flags/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: 'bad', text: j.error ?? 'Action failed. Retry.' });
    setMsg({ tone: 'ok', text: action === 'reject' ? `Record ${r.record?.fullName} rejected. Flag ${r.id} closed.` : action === 'escalate' ? `Flag ${r.id} escalated to AICTE.` : `Flag ${r.id} resolved.${j.recordStatus === 'VERIFIED' ? ' Record status is now VERIFIED.' : ''}` });
    setNote(''); setOpenId(null); load();
  }
  async function bulkResolve() {
    setBusy(true); setMsg(null);
    const res = await fetch('/api/v1/flags/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...sel], note: bulkNote }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: 'bad', text: j.error ?? 'Bulk resolve failed. Retry.' });
    setMsg({ tone: j.skipped?.length ? 'bad' : 'ok', text: `${j.resolved} flag${j.resolved === 1 ? '' : 's'} resolved.${j.skipped?.length ? ` ${j.skipped.length} skipped: ${j.skipped[0].reason}` : ''}` });
    setSel(new Set()); setBulkNote(''); load();
  }
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const filtered = !!(f.rule || f.severity || f.institution || f.batch || q.trim());
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const sel_ = 'h-8 px-2 border border-line rounded bg-surface text-sm';

  return (
    <div className="max-w-[1400px]">
      <div className="flex items-baseline gap-3"><h1 className="text-lg font-semibold">Flag queue</h1>{readOnly && <Badge>Read only</Badge>}
        {role === 'INSTITUTION_ADMIN' && <span className="text-muted text-sm">Your institution only. Escalated flags move to AICTE.</span>}</div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input data-search className="h-8 w-64 px-2 border border-line rounded bg-surface text-sm" placeholder="Search name, APAAR ID or message" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <span className="kbd -ml-1">/</span>
        <select className={sel_} value={f.rule} onChange={(e) => set({ rule: e.target.value })} aria-label="Rule"><option value="">All rules</option>{rules.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}</select>
        <select className={sel_} value={f.severity} onChange={(e) => set({ severity: e.target.value })} aria-label="Severity"><option value="">All severities</option><option>BLOCKER</option><option>WARNING</option><option>INFO</option></select>
        {institutions.length > 1 && <select className={`${sel_} max-w-[260px]`} value={f.institution} onChange={(e) => set({ institution: e.target.value })} aria-label="Institution"><option value="">All institutions</option>{institutions.map((i) => <option key={i.id} value={i.id}>{shortName(i.name)}</option>)}</select>}
        {f.batch && <button className="btn" onClick={() => set({ batch: '' })}>Batch <span className="font-mono text-xs">{f.batch.slice(0, 14)}</span> ×</button>}
        {filtered && <button className="btn" onClick={() => { setQ(''); set({ rule: '', severity: '', institution: '', batch: '' }); }}>Clear filters</button>}
      </div>

      <div className="mt-3 flex border-b border-line">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => set({ status: k })} className={`px-3 h-8 text-sm -mb-px border-b-2 ${f.status === k ? 'border-accent text-accent font-semibold' : 'border-transparent text-muted hover:text-ink'}`}>
            {l} <span className="font-mono text-xs ml-1">{data?.tabs[k] ?? ''}</span>
          </button>))}
      </div>

      {msg && <p role="status" className={`mt-3 border rounded px-3 py-2 text-sm ${msg.tone === 'ok' ? 'text-ok border-ok/40 bg-ok/5' : 'text-bad border-bad/40 bg-bad/5'}`}>{msg.text}</p>}

      {sel.size > 0 && (
        <div className="mt-3 flex items-center gap-3 border border-accent/40 bg-accent/5 rounded px-3 py-2">
          <span className="text-sm font-medium">{sel.size} selected</span>
          <input className="h-8 flex-1 max-w-md px-2 border border-line rounded bg-surface text-sm" placeholder="Resolution note, required" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} />
          <button className="btn btn-primary" disabled={busy || bulkNote.trim().length < 3} onClick={bulkResolve}>Resolve selected</button>
          <button className="btn" onClick={() => setSel(new Set())}>Clear</button>
        </div>)}

      <div className="mt-3 border border-line bg-surface rounded overflow-auto max-h-[calc(100vh-290px)]">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="th w-8"><input type="checkbox" aria-label="Select all" disabled={!actionable.length} checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(actionable.map((r) => r.id)))} /></th>
            <th className="th">Severity</th><th className="th">Rule</th><th className="th">Record</th><th className="th">Institution</th><th className="th">Detail</th>
            <th className="th text-right">Conf</th><th className="th">Status</th><th className="th">Raised</th></tr></thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => (<tr key={i}>{[16, 60, 190, 150, 120, 220, 36, 60, 80].map((w, j) => <td key={j} className="td"><div className="h-3 rounded-sm bg-line animate-pulse" style={{ width: w }} /></td>)}</tr>))}
            {!loading && error && <tr><td colSpan={9} className="td">Could not load flags. <button className="underline text-accent" onClick={load}>Retry</button></td></tr>}
            {!loading && !error && data && data.rows.length === 0 && (
              <tr><td colSpan={9} className="td text-muted">
                {filtered ? 'No flags match these filters.' : f.status === 'OPEN' ? `No flags open.${data.lastScan ? ` Last scan ran ${ist(data.lastScan)}.` : ''}` : 'No flags in this view.'}
                {role === 'INSTITUTION_ADMIN' && !filtered && f.status === 'OPEN' && <> <Link className="underline text-accent" href="/upload">Upload a batch.</Link></>}
              </td></tr>)}
            {!loading && !error && data?.rows.map((r) => {
              const open = openId === r.id, can = canAct(r);
              return (
                <Fragment key={r.id}>
                  <tr className={`group cursor-pointer ${open ? 'bg-paper' : 'hover:bg-paper'}`} onClick={() => { setOpenId(open ? null : r.id); setNote(''); setMsg(null); }}>
                    <td className="td" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.id}`} disabled={!can} checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td className="td"><Badge tone={SEVERITY_TONE[r.severity] as Tone}>{r.severity}</Badge></td>
                    <td className="td font-mono text-xs whitespace-nowrap">{r.ruleCode}</td>
                    <td className="td">{r.record ? <><div>{r.record.fullName}</div><div className="font-mono text-xs text-muted">{r.record.apaarId ?? '(no APAAR ID)'}</div></> : <span className="text-muted">Institution level</span>}</td>
                    <td className="td whitespace-nowrap">{shortName(r.institution.name)}</td>
                    <td className="td text-muted max-w-[320px] truncate" title={r.message}>{r.message}</td>
                    <td className="td num">{r.confidence != null ? r.confidence.toFixed(2) : <span className="text-muted">n/a</span>}</td>
                    <td className="td"><Badge tone={r.status === 'RESOLVED' ? 'ok' : r.status === 'ESCALATED' ? 'saffron' : 'neutral'}>{r.status}</Badge></td>
                    <td className="td whitespace-nowrap text-muted">{istDate(r.createdAt)} <span className="ml-2 text-accent opacity-0 group-hover:opacity-100">{open ? 'Close' : 'Review'}</span></td>
                  </tr>
                  {open && (
                    <tr><td colSpan={9} className="bg-paper border-b border-line px-4 py-4 cursor-default">
                      <div className="grid grid-cols-[1.1fr_1.4fr_1.1fr] gap-6">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Record</h3>
                          {r.record ? (<dl className="grid grid-cols-[96px_1fr] gap-y-1 text-sm">
                            <dt className="text-muted">Name</dt><dd>{r.record.fullName}</dd>
                            <dt className="text-muted">APAAR ID</dt><dd><span className="font-mono text-xs">{r.record.apaarId ?? 'missing'}</span>
                              {r.record.apaarId && (() => { const c = validateApaar(r.record.apaarId); return <div className="text-[10px] text-muted flex items-center gap-1">Format {c.formatOk ? '✓' : '✗'} · Checksum (mock) {c.checksumOk === null ? 'n/a' : c.checksumOk ? '✓' : '✗'} <MockBadge /></div>; })()}</dd>
                            <dt className="text-muted">DOB</dt><dd className="font-mono text-xs">{r.record.dob.slice(0, 10)}</dd>
                            <dt className="text-muted">Category</dt><dd className="font-mono text-xs">{r.record.category}, {r.record.admissionType}</dd>
                            <dt className="text-muted">Course</dt><dd>{r.record.courseName}, <span className="font-mono text-xs">{r.record.admissionYear}</span></dd>
                            <dt className="text-muted">Status</dt><dd><Badge tone={STATUS_TONE[r.record.status] as Tone}>{r.record.status}</Badge></dd>
                          </dl>) : <p className="text-sm text-muted">This flag applies to the institution, not to one record.</p>}
                          {r.related && (<div className="mt-3 border border-line bg-surface rounded px-3 py-2 text-sm"><div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Matched record</div>
                            <div>{r.related.fullName} <span className="font-mono text-xs text-muted">{r.related.apaarId}</span></div>
                            <div className="text-muted text-xs">{r.related.institutionName}, admitted {r.related.admissionYear}</div></div>)}
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Rule explanation</h3>
                          <p className="text-sm">{r.explanation}</p>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mt-3 mb-1">Suggested fix</h3>
                          <p className="text-sm">{r.suggestedFix}</p>
                          {r.status === 'RESOLVED' && <p className="mt-3 text-sm border-t border-line pt-2"><span className="text-ok font-semibold">Resolved</span> {r.resolvedAt && ist(r.resolvedAt)}{r.resolvedBy && <> by {r.resolvedBy}</>}.<br /><span className="text-muted">{r.resolutionNote}</span></p>}
                          {r.status === 'ESCALATED' && <p className="mt-3 text-sm text-saffron">Escalated to AICTE for decision.</p>}
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Action</h3>
                          {can ? (<>
                            <textarea className="w-full h-20 p-2 border border-line rounded bg-surface text-sm" placeholder="Note. Required to resolve or reject." value={note} onChange={(e) => setNote(e.target.value)} />
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button className="btn btn-primary" disabled={busy || note.trim().length < 3} onClick={() => act(r, 'resolve')}>Resolve</button>
                              <button className="btn" disabled={busy || r.status === 'ESCALATED'} onClick={() => act(r, 'escalate')} title={r.status === 'ESCALATED' ? 'Already escalated' : undefined}>Escalate</button>
                              <button className="btn text-bad" disabled={busy || !r.record || note.trim().length < 3} onClick={() => act(r, 'reject')} title={!r.record ? 'Institution-level flags have no record to reject' : 'Marks the record REJECTED and closes its open flags'}>Reject record</button>
                            </div>
                            {!r.record && <p className="mt-2 text-xs text-muted">Reject is unavailable for institution-level flags.</p>}
                          </>) : <p className="text-sm text-muted">{readOnly ? 'Read-only role. Actions are disabled.' : r.status === 'RESOLVED' ? 'No further action on a resolved flag.' : 'Escalated to AICTE. Only AICTE can act on it now.'}</p>}
                        </div>
                      </div>
                    </td></tr>)}
                </Fragment>);
            })}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="mt-2 flex items-center gap-3 text-sm text-muted">
          <span className="font-mono">{(page - 1) * data.pageSize + 1}-{Math.min(page * data.pageSize, data.total)} of {data.total}</span>
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>)}
    </div>
  );
}
