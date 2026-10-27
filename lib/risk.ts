// Institution Risk Score, 0-100. Weighted sum of five signals; every factor is returned so the UI can show it.
export const WEIGHTS = { overIntake: 30, flagged: 25, repeatedFull: 20, zScore: 15, invalidApaar: 10 } as const;

export interface RiskInput {
  id: string; state: string; type: string;
  approvedTotal: number;
  enrolledByYear: Record<string, number>; // "2024-25" -> n
  totalRecords: number;
  flaggedRecords: number;      // records with at least one open BLOCKER/WARNING flag
  invalidApaarRecords: number; // APAAR_FORMAT_INVALID or APAAR_MISSING
}
export interface RiskFactor { key: string; label: string; display: string; weight: number; subScore: number; points: number }
export interface RiskResult { institutionId: string; score: number; factors: RiskFactor[]; explanation: string }

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function peers(all: RiskInput[], me: RiskInput): RiskInput[] {
  const a = all.filter((o) => o.state === me.state && o.type === me.type);
  if (a.length >= 3) return a;
  const b = all.filter((o) => o.type === me.type);
  return b.length >= 3 ? b : all; // small demo dataset: fall back to all institutions
}

export function computeRiskScores(all: RiskInput[]): RiskResult[] {
  const latest = (i: RiskInput) => Object.keys(i.enrolledByYear).sort().slice(-1)[0];
  const fill = (i: RiskInput) => i.enrolledByYear[latest(i)] / i.approvedTotal;
  return all.map((i) => {
    const years = Object.keys(i.enrolledByYear).sort();
    const ratio = fill(i);
    const fullYears = years.filter((y) => Math.abs(i.enrolledByYear[y] / i.approvedTotal - 1) < 0.005).length;
    const ps = peers(all, i).map(fill);
    const mean = ps.reduce((s, x) => s + x, 0) / ps.length;
    const sd = Math.sqrt(ps.reduce((s, x) => s + (x - mean) ** 2, 0) / ps.length);
    const z = sd > 0 ? (ratio - mean) / sd : 0;
    const flaggedPct = i.flaggedRecords / i.totalRecords;
    const apaarPct = i.invalidApaarRecords / i.totalRecords;

    const raw = [
      { key: 'overIntake', label: 'Intake fill ratio', display: `${pct(ratio)} of approved (${latest(i)})`, w: WEIGHTS.overIntake, s: clamp((ratio - 0.9) / 0.2) },
      { key: 'flagged', label: 'Flagged records', display: `${pct(flaggedPct)} of records`, w: WEIGHTS.flagged, s: clamp(flaggedPct / 0.25) },
      { key: 'repeatedFull', label: 'Repeated 100% intake', display: `${fullYears} of ${years.length} years at 100%`, w: WEIGHTS.repeatedFull, s: years.length >= 2 && fullYears === years.length ? 1 : fullYears / (years.length * 2) },
      { key: 'zScore', label: 'Enrolment vs peers', display: `z = ${z.toFixed(2)}`, w: WEIGHTS.zScore, s: clamp(z / 2) },
      { key: 'invalidApaar', label: 'Invalid or missing APAAR', display: `${pct(apaarPct)} of records`, w: WEIGHTS.invalidApaar, s: clamp(apaarPct / 0.08) },
    ];
    const factors: RiskFactor[] = raw.map((r) => ({ key: r.key, label: r.label, display: r.display, weight: r.w, subScore: Math.round(r.s * 100) / 100, points: Math.round(r.w * r.s * 10) / 10 }));
    const score = Math.round(factors.reduce((s, f) => s + f.points, 0));
    const top = [...factors].filter((f) => f.points >= 3).sort((a, b) => b.points - a.points).slice(0, 3);
    const explanation = top.length
      ? top.map((f) => `${f.label.replace(/^(\w)(\w*)/, (_, a, b) => (b === b.toUpperCase() ? a + b : a.toLowerCase() + b))}: ${f.display}`).join('; ') + '.'
      : 'No signal above threshold.';
    return { institutionId: i.id, score, factors, explanation: explanation.charAt(0).toUpperCase() + explanation.slice(1) };
  });
}
