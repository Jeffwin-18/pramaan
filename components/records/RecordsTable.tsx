'use client';
import { useCallback, useEffect, useState } from 'react';
import { Badge, STATUS_TONE, type Tone } from '@/components/ui/Badge';
import { shortName } from '@/lib/format';
import RecordDrawer from './RecordDrawer';

interface Row { id: string; apaarId: string | null; fullName: string; institution: string; course: string; admissionYear: string; admissionType: string; category: string; status: string; openFlags: number }
const COLS: [string, string, string?][] = [['apaarId', 'APAAR ID'], ['fullName', 'Name'], ['', 'Institution'], ['', 'Course'], ['admissionYear', 'Year'], ['', 'Type'], ['', 'Cat'], ['status', 'Status'], ['', 'Open flags', 'r']];

export default function RecordsTable({ institutions, years, initial }: { institutions: { id: string; name: string }[]; years: string[]; initial: { batch: string; status: string; institution: string; year: string; q: string } }) {
  const [f, setF] = useState(initial);
  const [q, setQ] = useState(initial.q);
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Row[]; total: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(false);
    const p = new URLSearchParams({ page: String(page), sort: sort.key, dir: sort.dir });
    (['status', 'institution', 'year', 'batch'] as const).forEach((k) => f[k] && p.set(k, f[k]));
    if (q.trim()) p.set('q', q.trim());
    try { const r = await fetch(`/api/v1/records?${p}`); if (!r.ok) throw 0; setData(await r.json()); } catch { setErr(true); }
    setLoading(false);
  }, [f, q, sort, page]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const set = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setPage(1); };
  const sel = 'h-8 px-2 border border-line rounded bg-surface text-sm';
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtered = !!(f.status || f.institution || f.year || f.batch || q.trim());

  return (
    <div className="max-w-[1400px]">
      <h1 className="text-lg font-semibold">Student records</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input data-search className="h-8 w-72 px-2 border border-line rounded bg-surface text-sm" placeholder="Search APAAR ID or name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /><span className="kbd -ml-1">/</span>
        <select className={sel} value={f.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status"><option value="">All statuses</option>{['VERIFIED', 'FLAGGED', 'PENDING', 'REJECTED'].map((s) => <option key={s}>{s}</option>)}</select>
        <select className={sel} value={f.year} onChange={(e) => set({ year: e.target.value })} aria-label="Year"><option value="">All years</option>{years.map((y) => <option key={y}>{y}</option>)}</select>
        {institutions.length > 1 && <select className={`${sel} max-w-[240px]`} value={f.institution} onChange={(e) => set({ institution: e.target.value })} aria-label="Institution"><option value="">All institutions</option>{institutions.map((i) => <option key={i.id} value={i.id}>{shortName(i.name)}</option>)}</select>}
        {f.batch && <button className="btn" onClick={() => set({ batch: '' })}>Batch <span className="font-mono text-xs">{f.batch.slice(0, 14)}</span> ×</button>}
        {filtered && <button className="btn" onClick={() => { setQ(''); set({ status: '', institution: '', year: '', batch: '' }); }}>Clear filters</button>}
      </div>
      <div className="mt-3 border border-line bg-surface rounded overflow-auto max-h-[calc(100vh-200px)]">
        <table className="w-full text-sm">
          <thead><tr>{COLS.map(([k, l, a]) => (
            <th key={l} className={`th ${a === 'r' ? 'text-right' : ''} ${k ? 'cursor-pointer select-none hover:text-ink' : ''}`} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              onClick={k ? () => { setSort({ key: k, dir: sort.key === k && sort.dir === 'asc' ? 'desc' : 'asc' }); setPage(1); } : undefined}>
              {l}{sort.key === k && <span className="ml-1">{sort.dir === 'asc' ? '▲' : '▼'}</span>}</th>))}</tr></thead>
          <tbody>
            {loading && Array.from({ length: 10 }).map((_, i) => <tr key={i}>{[120, 150, 130, 140, 60, 70, 30, 60, 30].map((w, j) => <td key={j} className="td"><div className="h-3 rounded-sm bg-line animate-pulse" style={{ width: w }} /></td>)}</tr>)}
            {!loading && err && <tr><td className="td" colSpan={9}>Could not load records. <button className="underline text-accent" onClick={load}>Retry</button></td></tr>}
            {!loading && !err && data?.rows.length === 0 && <tr><td className="td text-muted" colSpan={9}>{filtered ? 'No records match these filters.' : 'No records yet. Upload a batch.'}</td></tr>}
            {!loading && !err && data?.rows.map((r) => (
              <tr key={r.id} className={`cursor-pointer ${openId === r.id ? 'bg-paper' : 'hover:bg-paper'}`} onClick={() => setOpenId(r.id)}>
                <td className="td font-mono text-xs">{r.apaarId ?? <span className="text-muted">missing</span>}</td>
                <td className="td">{r.fullName}</td><td className="td whitespace-nowrap">{shortName(r.institution)}</td><td className="td text-muted">{r.course}</td>
                <td className="td font-mono text-xs">{r.admissionYear}</td><td className="td text-xs">{r.admissionType}</td><td className="td font-mono text-xs">{r.category}</td>
                <td className="td"><Badge tone={STATUS_TONE[r.status] as Tone}>{r.status}</Badge></td>
                <td className="td num">{r.openFlags || <span className="text-muted">0</span>}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
      {data && data.total > 0 && <div className="mt-2 flex items-center gap-3 text-sm text-muted"><span className="font-mono">{(page - 1) * data.pageSize + 1}-{Math.min(page * data.pageSize, data.total)} of {data.total}</span>
        <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>}
      {openId && <RecordDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
