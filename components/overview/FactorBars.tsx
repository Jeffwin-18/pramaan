import type { Factor } from '@/lib/stats';
// Five small bars, one per risk factor. Title text carries the exact value.
export function FactorBars({ factors }: { factors: Factor[] }) {
  return (
    <div className="flex items-end gap-1.5" aria-label="Risk factors">
      {factors.map((f) => (
        <div key={f.key} className="flex flex-col items-center gap-0.5" title={`${f.label}: ${f.display}. ${f.points} of ${f.weight} points`}>
          <div className="h-7 w-3 bg-paper border border-line rounded-sm flex items-end"><div className={f.subScore >= 0.6 ? 'bg-bad w-full' : f.subScore >= 0.3 ? 'bg-warn w-full' : 'bg-accent/60 w-full'} style={{ height: `${Math.max(f.subScore * 100, 4)}%` }} /></div>
        </div>))}
    </div>
  );
}
export const FACTOR_KEY = 'Bars left to right: intake fill, flagged records, repeated 100% intake, enrolment vs peers, invalid APAAR';
export function RiskScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted">n/a</span>;
  return <span className={`font-mono font-semibold ${score >= 50 ? 'text-bad' : score >= 25 ? 'text-warn' : 'text-ink'}`}>{score}</span>;
}
