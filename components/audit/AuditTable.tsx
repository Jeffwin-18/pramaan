'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ist } from '@/lib/format';

interface Row { id: string; at: string; actor: { name: string; email: string } | null; role: string; action: string; entityType: string; entityId: string; before: unknown; after: unknown; ip: string }
interface Data { rows: Row[]; total: number; pageSize: number; actions: string[]; actors: { id: string; name: string }[] }
const TONE = (a: string) => (a.startsWith('VERIFY') || a === 'CERTIFICATE_DOWNLOAD' ? 'accent' : a.includes('REJECT') || a === 'LOGIN_FAILED' ? 'bad' : a.includes('ESCALATE') ? 'saffron' : 'neutral') as 'accent' | 'bad' | 'saffron' | 'neutral';

export default function AuditTable() {
  const [f, setF] = useState({ action: '', role: '', actor: '', from: '', to: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(false);
    const p = new URLSearchParams({ page: String(page) });
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v)); if (q.trim()) p.set('q', q.trim());
    try { const r = await fetch(`/api/v1/audit?${p}`); if (!r.ok) throw 0; setD(await r.json()); } catch { setErr(true); }
    setLoading(false);
  }, [f, q, page]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);

  const set = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setPage(1); };
  const sel = 'h-8 px-2 border border-line rounded bg-surface text-sm';
  const filtered = Object.values(f).some(Boolean) || q.trim();
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;

  return (
    <div className="max-w-[1400px]">
      <div className="flex items-center gap-3"><h1 className="text-lg font-semibold">Audit log</h1><Badge>Append only</Badge><span className="text-sm text-muted">Entries cannot be edited or deleted from this system.</span></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input data-search className="h-8 w-60 px-2 border border-line rounded bg-surface text-sm" placeholder="Search entity, action or detail" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /><span className="kbd -ml-1">/</span>
        <select className={sel} value={f.action} onChange={(e) => set({ action: e.target.value })} aria-label="Action"><option value="">All actions</option>{d?.actions.map((a) => <option key={a}>{a}</option>)}</select>
        <select className={sel} value={f.role} onChange={(e) => set({ role: e.target.value })} aria-label="Role"><option value="">All roles</option>{['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'VERIFIER', 'AUDITOR', 'PUBLIC', 'ANONYMOUS'].map((r) => <option key={r}>{r}</option>)}</select>
        <select className={`${sel} max-w-[220px]`} value={f.actor} onChange={(e) => set({ actor: e.target.value })} aria-label="Actor"><option value="">All actors</option>{d?.actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <label className="text-sm text-muted flex items-center gap-1">From <input type="date" className={sel} value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="text-sm text-muted flex items-center gap-1">To <input type="date" className={sel} value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
        {filtered && <button className="btn" onClick={() => { setQ(''); set({ action: '', role: '', actor: '', from: '', to: '' }); }}>Clear filters</button>}
      </div>
      <div className="mt-3 border border-line bg-surface rounded overflow-auto max-h-[calc(100vh-210px)]">
        <table className="w-full text-sm">
          <thead><tr><th className="th">Time</th><th className="th">Actor</th><th className="th">Role</th><th className="th">Action</th><th className="th">Entity</th><th className="th">IP</th></tr></thead>
          <tbody>
            {loading && Array.from({ length: 10 }).map((_, i) => <tr key={i}>{[150, 180, 110, 130, 200, 90].map((w, j) => <td key={j} className="td"><div className="h-3 rounded-sm bg-line animate-pulse" style={{ width: w }} /></td>)}</tr>)}
            {!loading && err && <tr><td className="td" colSpan={6}>Could not load the audit log. <button className="underline text-accent" onClick={load}>Retry</button></td></tr>}
            {!loading && !err && d?.rows.length === 0 && <tr><td className="td text-muted" colSpan={6}>{filtered ? 'No entries match these filters.' : 'No audit entries yet.'}</td></tr>}
            {!loading && !err && d?.rows.map((r) => (
              <Fragment key={r.id}>
                <tr className={`cursor-pointer ${open === r.id ? 'bg-paper' : 'hover:bg-paper'}`} onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <td className="td whitespace-nowrap font-mono text-xs">{ist(r.at)}</td>
                  <td className="td">{r.actor ? <><div>{r.actor.name}</div><div className="font-mono text-[11px] text-muted">{r.actor.email}</div></> : <span className="text-muted">Unauthenticated</span>}</td>
                  <td className="td text-xs">{r.role}</td><td className="td"><Badge tone={TONE(r.action)}>{r.action}</Badge></td>
                  <td className="td"><span className="text-xs text-muted">{r.entityType}</span> <span className="font-mono text-xs">{r.entityId}</span></td><td className="td font-mono text-xs">{r.ip}</td>
                </tr>
                {open === r.id && <tr><td colSpan={6} className="px-4 py-3 bg-paper border-b border-line"><div className="grid grid-cols-2 gap-4">
                  {(['before', 'after'] as const).map((k) => <div key={k}><div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">{k}</div><pre className="font-mono text-xs bg-surface border border-line rounded p-2 overflow-auto max-h-48">{r[k] ? JSON.stringify(r[k], null, 2) : 'none'}</pre></div>)}
                  <div className="col-span-2 font-mono text-[11px] text-muted">Audit ID {r.id}</div></div></td></tr>}
              </Fragment>))}
          </tbody>
        </table>
      </div>
      {d && d.total > 0 && <div className="mt-2 flex items-center gap-3 text-sm text-muted"><span className="font-mono">{(page - 1) * d.pageSize + 1}-{Math.min(page * d.pageSize, d.total)} of {d.total}</span>
        <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </div>
  );
}
