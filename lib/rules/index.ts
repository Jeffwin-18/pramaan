// Rule registry. Each rule is a pure function (record, context) => FlagDraft[].
import { apaarFormatInvalid, apaarMissing } from './apaar';
import { duplicateWithinInstitution, duplicateAcrossInstitutions, nameNearMatchExisting } from './duplicates';
import { intakeExceeded, supernumeraryExceeded, categoryMismatch } from './capacity';
import { nriOciFnInconsistent, dobImplausible } from './identity';
import type { FlagDraft, Rule } from './types';

export const RULES: { code: string; label: string; fn: Rule }[] = [
  { code: 'APAAR_FORMAT_INVALID', label: 'APAAR format or checksum (mock) invalid', fn: apaarFormatInvalid },
  { code: 'APAAR_MISSING', label: 'APAAR ID missing', fn: apaarMissing },
  { code: 'DUPLICATE_WITHIN_INSTITUTION', label: 'Duplicate within institution', fn: duplicateWithinInstitution },
  { code: 'DUPLICATE_ACROSS_INSTITUTIONS', label: 'Duplicate across institutions', fn: duplicateAcrossInstitutions },
  { code: 'INTAKE_EXCEEDED', label: 'Course intake exceeded', fn: intakeExceeded },
  { code: 'SUPERNUMERARY_EXCEEDED', label: 'Supernumerary seats exceeded', fn: supernumeraryExceeded },
  { code: 'CATEGORY_MISMATCH', label: 'Seat category mismatch', fn: categoryMismatch },
  { code: 'NRI_OCI_FN_INCONSISTENT', label: 'NRI / OCI / FN inconsistent', fn: nriOciFnInconsistent },
  { code: 'DOB_IMPLAUSIBLE', label: 'Date of birth implausible', fn: dobImplausible },
  { code: 'NAME_NEAR_MATCH_EXISTING', label: 'Name near-match to existing record', fn: nameNearMatchExisting },
];

export function runRecordRules(record: Parameters<Rule>[0], ctx: Parameters<Rule>[1]): FlagDraft[] {
  return RULES.flatMap((r) => r.fn(record, ctx));
}

export { institutionRules } from './institution';
export { ExistingIndex } from './types';
export type { RecordInput, FlagDraft, RuleContext, CourseInfo, CourseYearCounts, Severity } from './types';
