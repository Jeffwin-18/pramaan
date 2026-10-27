import Link from 'next/link';
import { FACTOR_KEY, FactorBars, RiskScoreCell } from './FactorBars';
import { Badge, SEVERITY_TONE, type Tone } from '@/components/ui/Badge';
import { getInstitutionDetail, getInstitutionStats } from '@/lib/stats';
import { ist, istDate } from '@/lib/format';
import type { Role } from '@/lib/roles';

function Sparkline({ points }: { points: [string, number][] }) {
  const w = 160, h = 36, max = Math.max(...points.map((p) => p[1]), 1), min = Math.min(...points.map((p) => p[1]), 0);
  const xy = points.map(([, v], i) => [points.length === 1 ? w / 2 : 6 + (i * (w - 12)) / (points.length - 1), h - 6 - ((v - min) / (max - min || 1)) * (h - 12)]);
  return (
    <div><svg width={w} height={h} role="img" aria-label="Enrolment trend"><polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke="#1F3A5F" strokeWidth="1.5" />{xy.map((p, i) => <rect key={i} x={p[0] - 2} y={p[1] - 2} width="4" height="4" fill="#1F3A5F" />)}</svg>
      <div className="flex justify-between text-[10px] text-muted font-mono" style={{ width: w }}>{points.map(([y, v]) => <span key={y}>{y.slice(2, 4)}: {v}</span>)}</div></div>
  );
}

export default async function InstitutionDetail({ id, role, year, base }: { id: string; role: Role; year?: string; base: string }) {
  const d = await getInstitutionDetail(id);
  if (!d) return <p className="text-muted">Institution not found.</p>;
  const { stats, year: defYear } = await getInstitutionStats({ institutionId: id });
  const s = stats[0], inst = d.inst;
  const years = Object.keys(s.enrolledByYear).sort(), y = year && years.includes(year) ? year : defYear;
  const enrolled = (cid: string) => d.recs.find((r) => r.courseId === cid && r.admissionYear === y)?._count._all ?? 0;
  const tot = inst.courses.reduce((a: any, c: any) => ({ ap: a.ap + c.approvedIntake, ss: a.ss + c.supernumerarySeats, en: a.en + enrolled(c.id) }), { ap: 0, ss: 0, en: 0 });
  const gapCls = (gap: number) => (gap < 0 ? 'text-bad font-semibold' : gap === 0 ? 'text-warn' : '');
  return (
    <div className="max-w-[1400px] space-y-4">
      <div className="flex items-start gap-4">
        <div><h1 className="text-lg font-semibold">{inst.name}</h1><div className="text-sm text-muted"><span className="font-mono">{inst.aicteId}</span> · {inst.type} · {inst.city}, {inst.state}</div></div>
        <div className="ml-auto flex gap-2">
          {role === 'INSTITUTION_ADMIN' ? <Link className="btn btn-primary" href="/upload">Upload data</Link> : <button className="btn" disabled title="Only the institution's own administrator can upload data">Upload data</button>}
          <Link className="btn" href={`/flags?institution=${id}`}>Open flag queue</Link>
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x divide-line border border-line bg-surface rounded">
        <div className="px-4 py-3"><div className="text-xs uppercase tracking-wide text-muted">Risk score</div><div className="text-2xl"><RiskScoreCell score={s.risk} /></div></div>
        <div className="px-4 py-3"><div className="text-xs uppercase tracking-wide text-muted">Fill, {y}</div><div className={`font-mono text-2xl ${s.overIntake ? 'text-bad' : ''}`}>{((s.enrolledByYear[y] ?? 0) / s.approvedTotal * 100).toFixed(1)}%</div></div>
        <div className="px-4 py-3"><div className="text-xs uppercase tracking-wide text-muted">Records</div><div className="font-mono text-2xl">{s.records}</div><div className="text-xs text-muted">{s.verified} verified</div></div>
        <div className="px-4 py-3"><div className="text-xs uppercase tracking-wide text-muted">Enrolment trend</div><Sparkline points={years.map((yy) => [yy, s.enrolledByYear[yy]])} /></div>
      </div>

      <section className="border border-line bg-surface rounded">
        <div className="px-4 py-2 border-b border-line flex items-center gap-3"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Courses</h2>
          <div className="ml-auto flex gap-1">{years.map((yy) => <Link key={yy} href={`${base}?year=${yy}`} className={`px-2 py-0.5 rounded border font-mono text-xs ${yy === y ? 'bg-accent text-white border-accent' : 'border-line hover:bg-paper'}`}>{yy}</Link>)}</div></div>
        <table className="w-full text-sm"><thead><tr><th className="th">Course</th><th className="th">Level</th><th className="th text-right">Approved intake</th><th className="th text-right">Supernumerary</th><th className="th text-right">Enrolled</th><th className="th text-right" title="Approved + supernumerary - enrolled. Negative means over limit.">Gap</th></tr></thead>
          <tbody>{inst.courses.map((c: any) => { const e = enrolled(c.id), gap = c.approvedIntake + c.supernumerarySeats - e; return <tr key={c.id} className="hover:bg-paper"><td className="td">{c.name}</td><td className="td">{c.level}</td><td className="td num">{c.approvedIntake}</td><td className="td num">{c.supernumerarySeats}</td><td className="td num">{e}</td><td className={`td num ${gapCls(gap)}`}>{gap}</td></tr>; })}
            <tr className="bg-paper font-semibold"><td className="td" colSpan={2}>Total</td><td className="td num">{tot.ap}</td><td className="td num">{tot.ss}</td><td className="td num">{tot.en}</td><td className={`td num ${gapCls(tot.ap + tot.ss - tot.en)}`}>{tot.ap + tot.ss - tot.en}</td></tr></tbody></table>
      </section>

      <div className="grid grid-cols-[1fr_1.6fr] gap-4">
        <section className="border border-line bg-surface rounded">
          <div className="px-4 py-2 border-b border-line"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Risk factors</h2></div>
          <div className="p-4">{s.factors.length ? <><FactorBars factors={s.factors} /><ul className="mt-3 space-y-1 text-sm">{s.factors.map((f) => <li key={f.key} className="flex justify-between gap-3"><span>{f.label}</span><span className="text-muted text-right">{f.display} <span className="font-mono text-ink">{f.points}/{f.weight}</span></span></li>)}</ul>
            <p className="mt-3 text-sm text-muted">{s.riskExplanation}</p><p className="mt-2 text-xs text-muted">{FACTOR_KEY}.</p></> : <p className="text-sm text-muted">Risk score not computed yet.</p>}</div>
        </section>
        <section className="border border-line bg-surface rounded">
          <div className="px-4 py-2 border-b border-line flex"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Open flags ({d.flags.length})</h2><Link className="ml-auto text-xs underline text-accent" href={`/flags?institution=${id}`}>View all</Link></div>
          <table className="w-full text-sm"><tbody>
            {d.flags.length === 0 && <tr><td className="td text-muted">No flags open.{d.batches[0] ? ` Last scan ran ${ist(d.batches[0].createdAt)}.` : ''}</td></tr>}
            {d.flags.slice(0, 8).map((f: any) => <tr key={f.id} className="hover:bg-paper"><td className="td"><Badge tone={SEVERITY_TONE[f.severity] as Tone}>{f.severity}</Badge></td><td className="td font-mono text-xs">{f.ruleCode}</td><td className="td">{f.record?.fullName ?? <span className="text-muted">Institution level</span>}</td><td className="td text-muted text-xs">{istDate(f.createdAt)}</td></tr>)}
          </tbody></table>
        </section>
      </div>
    </div>
  );
}
