import type { FlagDraft } from './types';

export interface InstitutionYearStat { year: string; enrolled: number; approved: number; supernumerary: number }

// Institution-level flags (recordId = null).
export function institutionRules(name: string, stats: InstitutionYearStat[]): FlagDraft[] {
  const out: FlagDraft[] = [];
  for (const s of stats) {
    const cap = s.approved + s.supernumerary;
    if (s.enrolled > cap) {
      const pct = ((s.enrolled / s.approved - 1) * 100).toFixed(1);
      out.push({
        ruleCode: 'INTAKE_EXCEEDED', severity: 'BLOCKER', confidence: null,
        message: `${s.year}: enrolment ${s.enrolled} against approved ${s.approved}`,
        explanation: `${name} reported ${s.enrolled} admissions for ${s.year} against an approved intake of ${s.approved} (+${s.supernumerary} supernumerary). That is ${pct}% above approved intake.`,
        suggestedFix: 'Request the institution to justify the excess admissions. Refer to the regional office if unexplained.',
      });
    }
  }
  const sorted = [...stats].sort((a, b) => a.year.localeCompare(b.year));
  const full = sorted.length >= 2 && sorted.every((s) => s.enrolled === s.approved);
  if (full) {
    out.push({
      ruleCode: 'FULL_INTAKE_CONSECUTIVE_YEARS', severity: 'INFO', confidence: null,
      message: `Intake filled exactly 100% in ${sorted.map((s) => s.year).join(' and ')}`,
      explanation: `${name} admitted exactly its approved intake in consecutive years. Exact fills are uncommon and warrant a sample audit.`,
      suggestedFix: 'Sample-check enrolment against fee receipts and attendance records.',
    });
  }
  return out;
}
