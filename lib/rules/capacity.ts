import type { Rule } from './types';

// 5. INTAKE_EXCEEDED (course enrolment > approved intake + supernumerary)
export const intakeExceeded: Rule = (r, ctx) => {
  const cap = ctx.course.approvedIntake + ctx.course.supernumerarySeats;
  if (ctx.counts.total <= cap) return [];
  return [{
    ruleCode: 'INTAKE_EXCEEDED',
    severity: 'BLOCKER',
    message: `Enrolment ${ctx.counts.total} exceeds limit ${cap}`,
    explanation: `${ctx.course.name} ${r.admissionYear} has an approved intake of ${ctx.course.approvedIntake} plus ${ctx.course.supernumerarySeats} supernumerary. This is admission number ${ctx.counts.total}, ${ctx.counts.total - cap} over the limit.`,
    suggestedFix: 'Verify the approved intake for this year in the AICTE approval letter. Admissions beyond the limit need regulatory review.',
    confidence: null,
  }];
};

// 6. SUPERNUMERARY_EXCEEDED
export const supernumeraryExceeded: Rule = (r, ctx) => {
  if (r.admissionType !== 'supernumerary' || ctx.counts.supernumerary <= ctx.course.supernumerarySeats) return [];
  return [{
    ruleCode: 'SUPERNUMERARY_EXCEEDED',
    severity: 'BLOCKER',
    message: `Supernumerary admission ${ctx.counts.supernumerary} exceeds ${ctx.course.supernumerarySeats} seats`,
    explanation: `${ctx.course.name} ${r.admissionYear} sanctions ${ctx.course.supernumerarySeats} supernumerary seat(s). This is supernumerary admission number ${ctx.counts.supernumerary}.`,
    suggestedFix: 'Check the supernumerary quota against the approval letter. Reclassify the admission type if it was entered wrongly.',
    confidence: null,
  }];
};

// 7. CATEGORY_MISMATCH (seat category counts inconsistent with declared matrix; regular admissions only)
export const categoryMismatch: Rule = (r, ctx) => {
  if (r.admissionType !== 'regular') return [];
  const declared = ctx.course.declaredCategorySeats[r.category] ?? 0;
  const actual = ctx.counts.regularByCategory[r.category] ?? 0;
  if (actual <= declared) return [];
  return [{
    ruleCode: 'CATEGORY_MISMATCH',
    severity: 'WARNING',
    message: `${r.category} admissions ${actual} exceed declared ${declared}`,
    explanation: `${ctx.course.name} declares ${declared} ${r.category} seat(s). This is regular ${r.category} admission number ${actual}. Category counts are inconsistent with the declared seat matrix.`,
    suggestedFix: 'Check the category certificate and the declared seat matrix. Correct the category or the matrix.',
    confidence: null,
  }];
};
