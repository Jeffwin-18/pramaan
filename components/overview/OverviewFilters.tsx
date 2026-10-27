'use client';
import { useRouter } from 'next/navigation';
export default function OverviewFilters({ years, states, types, cur }: { years: string[]; states: string[]; types: string[]; cur: { year: string; state: string; type: string } }) {
  const r = useRouter();
  const go = (k: string, v: string) => { const p = new URLSearchParams({ ...cur, [k]: v }); [...p.keys()].forEach((x) => !p.get(x) && p.delete(x)); r.push(`/overview?${p}`); };
  const s = 'h-8 px-2 border border-line rounded bg-surface text-sm';
  return (
    <div className="flex items-center gap-2">
      <select className={s} value={cur.year} onChange={(e) => go('year', e.target.value)} aria-label="Year"><option value="">All years</option>{years.map((y) => <option key={y}>{y}</option>)}</select>
      <select className={s} value={cur.state} onChange={(e) => go('state', e.target.value)} aria-label="State"><option value="">All states</option>{states.map((y) => <option key={y}>{y}</option>)}</select>
      <select className={s} value={cur.type} onChange={(e) => go('type', e.target.value)} aria-label="Institution type"><option value="">All types</option>{types.map((y) => <option key={y}>{y}</option>)}</select>
      {(cur.year || cur.state || cur.type) && <button className="btn" onClick={() => r.push('/overview')}>Clear</button>}
    </div>
  );
}
