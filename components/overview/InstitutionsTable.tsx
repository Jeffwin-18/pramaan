'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { RiskScoreCell } from './FactorBars';
import { shortName } from '@/lib/format';
import type { InstStat } from '@/lib/stats';

type K = 'name' | 'state' | 'type' | 'approvedTotal' | 'enrolled' | 'fillPct' | 'risk' | 'openFlags';
const COLS: [K, string, boolean?][] = [['name', 'Institution'], ['state', 'State'], ['type', 'Type'], ['approvedTotal', 'Intake', true], ['enrolled', 'Enrolled', true], ['fillPct', 'Fill', true], ['risk', 'Risk', true], ['openFlags', 'Open flags', true]];

export default function InstitutionsTable({ rows, year }: { rows: InstStat[]; year: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: K; dir: 1 | -1 }>({ k: 'risk', dir: -1 });
  const list = useMemo(() => rows.filter((r) => `${r.name} ${r.state} ${r.type} ${r.aicteId}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => { const x = (a[sort.k] ?? -1) as any, y = (b[sort.k] ?? -1) as any; return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; }), [rows, q, sort]);
  return (
    <div className="max-w-[1400px]">
      <div className="flex items-baseline gap-3"><h1 className="text-lg font-semibold">Institutions</h1><span className="text-sm text-muted">Enrolment for <span className="font-mono">{year}</span></span></div>
      <div className="mt-3 flex items-center gap-2"><input data-search className="h-8 w-72 px-2 border border-line rounded bg-surface text-sm" placeholder="Search name, state, type or AICTE ID" value={q} onChange={(e) => setQ(e.target.value)} /><span className="kbd -ml-1">/</span></div>
      <div className="mt-3 border border-line bg-surface rounded overflow-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="th">AICTE ID</th>{COLS.map(([k, l, r]) => <th key={k} className={`th cursor-pointer select-none hover:text-ink ${r ? 'text-right' : ''}`} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined} onClick={() => setSort({ k, dir: sort.k === k ? (-sort.dir as 1 | -1) : 1 })}>{l}{sort.k === k && <span className="ml-1">{sort.dir === 1 ? '▲' : '▼'}</span>}</th>)}</tr></thead>
          <tbody>
            {list.length === 0 && <tr><td className="td text-muted" colSpan={9}>{q ? 'No institutions match this search.' : 'No institutions in scope.'}</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="group cursor-pointer hover:bg-paper" onClick={() => router.push(`/institutions/${r.id}`)}>
                <td className="td font-mono text-xs text-muted">{r.aicteId}</td>
                <td className="td"><Link href={`/institutions/${r.id}`} className="text-accent group-hover:underline" onClick={(e) => e.stopPropagation()}>{shortName(r.name)}</Link><div className="text-xs text-muted">{r.city}</div></td>
                <td className="td">{r.state}</td><td className="td">{r.type}</td>
                <td className="td num">{r.approvedTotal}</td><td className="td num">{r.enrolled}</td>
                <td className={`td num ${r.overIntake ? 'text-bad font-semibold' : r.fillPct >= 99.5 ? 'text-warn font-semibold' : ''}`}>{r.fillPct.toFixed(1)}%</td>
                <td className="td num"><RiskScoreCell score={r.risk} /></td><td className="td num">{r.openFlags}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
