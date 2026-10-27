import type { Rule } from './types';

// 8. NRI_OCI_FN_INCONSISTENT
export const nriOciFnInconsistent: Rule = (r) => {
  const issues: string[] = [];
  if (r.isOCI && r.admissionType !== 'OCI') issues.push(`OCI holder admitted as "${r.admissionType}"`);
  if (r.isNRI && r.admissionType !== 'NRI') issues.push(`NRI sponsored candidate admitted as "${r.admissionType}"`);
  if (r.isForeignNational && r.admissionType !== 'FN') issues.push(`foreign national admitted as "${r.admissionType}"`);
  if (r.admissionType === 'NRI' && !r.isNRI) issues.push('admission type NRI but NRI flag is false');
  if (r.admissionType === 'OCI' && !r.isOCI) issues.push('admission type OCI but OCI flag is false');
  if (r.admissionType === 'FN' && !r.isForeignNational) issues.push('admission type FN but foreign national flag is false');
  if (!issues.length) return [];
  return [{
    ruleCode: 'NRI_OCI_FN_INCONSISTENT',
    severity: 'WARNING',
    message: 'Residency status and admission type disagree',
    explanation: `${issues.join('; ')}. Quota-based admissions must carry a matching admission type.`,
    suggestedFix: 'Correct the admission type, or clear the residency flag if it was set in error. Attach the supporting document.',
    confidence: null,
  }];
};

// 9. DOB_IMPLAUSIBLE (age at 1 Aug of admission year outside 15-60)
export const dobImplausible: Rule = (r) => {
  const start = parseInt(r.admissionYear.slice(0, 4), 10);
  const ref = new Date(Date.UTC(start, 7, 1));
  let age = ref.getUTCFullYear() - r.dob.getUTCFullYear();
  const m = ref.getUTCMonth() - r.dob.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < r.dob.getUTCDate())) age--;
  if (age >= 15 && age <= 60) return [];
  return [{
    ruleCode: 'DOB_IMPLAUSIBLE',
    severity: 'WARNING',
    message: `Age at admission ${age} is outside 15-60`,
    explanation: `Date of birth ${r.dob.toISOString().slice(0, 10)} gives an age of ${age} on 1 Aug ${start}. Likely a typing error in the year.`,
    suggestedFix: 'Check the date of birth against the Class X certificate and correct the record.',
    confidence: null,
  }];
};
