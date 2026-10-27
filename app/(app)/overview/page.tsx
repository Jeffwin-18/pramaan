import Link from 'next/link';
import { FACTOR_KEY, FactorBars, RiskScoreCell } from '@/components/overview/FactorBars';
import OverviewFilters from '@/components/overview/OverviewFilters';
import RuleChart from '@/components/overview/RuleChart';
import { requirePage } from '@/lib/auth';
import { ist, shortName } from '@/lib/format';
import { getOverview } from '@/lib/stats';

export const dynamic = 'force-dynamic';
const VERB: Record<string, string> = { UPLOAD_COMMIT: 'committed batch', UPLOAD_VALIDATE: 'ran validation on', FLAG_RESOLVE: 'resolved flag', FLAG_ESCALATE: 'escalated flag', RECORD_REJECT: 'rejected record', VERIFY_RECORD: 'verified APAAR via consent', LOGIN: 'signed in', LOGOUT: 'signed out', REPORT_EXPORT: 'exported report' };
const Kpi = ({ label, value, sub, tone = '' }: { label: string; value: string; sub?: string; tone?: string }) => (
  <div className="px-4 py-3"><div className="text-xs uppercase tracking-wide text-muted">{label}</div><div className={`font-mono text-2xl ${tone}`}>{value}</div>{sub && <div className="text-xs text-muted">{sub}</div>}</div>);
const Panel = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className="border border-line bg-surface rounded"><div className="px-4 py-2 border-b border-line flex items-center"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2><div className="ml-auto text-xs text-muted">{right}</div></div>{children}</section>);

export default async function Overview({ searchParams: s }: { searchParams: Record<string, string | undefined> }) {
  await requirePage('/overview');
  const cur = { year: s.year ?? '', state: s.state ?? '', type: s.type ?? '' };
  const o = await getOverview(cur);
  const all = await getOverview({});
  const ranked = [...o.stats].sort((a, b) => (b.risk ?? -1) - (a.risk ?? -1));
  return (
    <div className="max-w-[1400px] space-y-4">
      <div className="flex items-center gap-4"><h1 className="text-lg font-semibold">Overview</h1><span className="text-sm text-muted">Reporting year <span className="font-mono">{cur.year || o.year}</span></span><div className="ml-auto"><OverviewFilters years={all.years} states={[...new Set(all.stats.map((x) => x.state))].sort()} types={[...new Set(all.stats.map((x) => x.type))].sort()} cur={cur} /></div></div>

      <div className="grid grid-cols-5 divide-x divide-line border border-line bg-surface rounded">
        <Kpi label="Institutions reporting" value={`${o.kpi.reporting}`} sub={`of ${o.kpi.institutions} in scope`} />
        <Kpi label="Student records" value={o.kpi.records.toLocaleString('en-IN')} />
        <Kpi label="Verified" value={`${o.kpi.verifiedPct.toFixed(1)}%`} sub="of records in scope" tone="text-ok" />
        <Kpi label="Open blockers" value={`${o.kpi.openBlockers}`} sub="unresolved flags" tone={o.kpi.openBlockers ? 'text-bad' : ''} />
        <Kpi label="Over-intake institutions" value={`${o.kpi.overIntake}`} sub={`${o.year}, above approved + supernumerary`} tone={o.kpi.overIntake ? 'text-warn' : ''} />
      </div>

      <div className="grid grid-cols-[1.1fr_1fr] gap-4">
        <Panel title="State-wise coverage">
          <table className="w-full text-sm"><thead><tr><th className="th">State</th><th className="th text-right">Institutions</th><th className="th text-right">Reporting</th><th className="th text-right">Records</th><th className="th text-right">Verified</th><th className="th text-right">Open flags</th><th className="th text-right">Over intake</th></tr></thead>
            <tbody>{o.states.length === 0 && <tr><td className="td text-muted" colSpan={7}>No institutions match these filters.</td></tr>}
              {o.states.map((r) => <tr key={r.state} className="hover:bg-paper"><td className="td">{r.state}</td><td className="td num">{r.institutions}</td><td className="td num">{r.reporting}</td><td className="td num">{r.records}</td><td className="td num">{r.verifiedPct.toFixed(1)}%</td><td className="td num">{r.openFlags}</td><td className="td num">{r.overIntake || <span className="text-muted">0</span>}</td></tr>)}</tbody></table>
        </Panel>
        <Panel title="Open flags by rule" right={<Link className="underline text-accent" href="/flags">Open queue</Link>}>
          <div className="p-3">{o.rules.length ? <RuleChart data={o.rules} /> : <p className="text-sm text-muted p-1">No open flags in scope.</p>}</div>
        </Panel>
      </div>

      <Panel title="Institution risk score" right={<>Computed {o.stats[0]?.riskComputedAt ? ist(o.stats[0].riskComputedAt) : 'n/a'}</>}>
        <table className="w-full text-sm">
          <thead><tr><th className="th w-8 text-right">#</th><th className="th">Institution</th><th className="th text-right">Score</th><th className="th" title={FACTOR_KEY}>Factors</th><th className="th">Why</th><th className="th text-right">Open flags</th></tr></thead>
          <tbody>
            {ranked.length === 0 && <tr><td className="td text-muted" colSpan={6}>No institutions match these filters.</td></tr>}
            {ranked.map((r, i) => (
              <tr key={r.id} className="hover:bg-paper align-top">
                <td className="td num text-muted">{i + 1}</td>
                <td className="td whitespace-nowrap"><Link className="text-accent hover:underline" href={`/institutions/${r.id}`}>{shortName(r.name)}</Link><div className="text-xs text-muted">{r.state}, {r.type}</div></td>
                <td className="td text-right text-lg"><RiskScoreCell score={r.risk} /></td>
                <td className="td"><FactorBars factors={r.factors} /></td>
                <td className="td text-muted max-w-[420px]">{r.riskExplanation}</td>
                <td className="td num"><Link className="text-accent hover:underline" href={`/flags?institution=${r.id}`}>{r.openFlags}</Link></td>
              </tr>))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-muted border-t border-line">{FACTOR_KEY}. Hover a bar for its value. Weights: intake fill 30, flagged records 25, repeated 100% intake 20, enrolment vs peers 15, invalid APAAR 10.</p>
      </Panel>

      <Panel title="Recent activity" right={<Link className="underline text-accent" href="/audit">Audit log</Link>}>
        <ul>{o.activity.map((a) => <li key={a.id} className="px-4 py-1.5 border-b border-line last:border-0 flex gap-3 text-sm"><span className="font-mono text-xs text-muted w-40 shrink-0">{ist(a.at)}</span><span><span className="font-medium">{a.who}</span> {VERB[a.action] ?? a.action.toLowerCase()} <span className="font-mono text-xs text-muted">{a.entity.slice(0, 22)}</span></span></li>)}</ul>
      </Panel>
    </div>
  );
}
