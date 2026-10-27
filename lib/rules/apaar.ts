import { validateApaar } from '../apaar';
import type { Rule } from './types';

// 1. APAAR_FORMAT_INVALID
export const apaarFormatInvalid: Rule = (r) => {
  if (!r.apaarId || !r.apaarId.trim()) return [];
  const c = validateApaar(r.apaarId);
  if (c.formatOk && c.checksumOk) return [];
  const checksumOnly = c.formatOk;
  return [{
    ruleCode: 'APAAR_FORMAT_INVALID',
    severity: 'BLOCKER',
    message: `APAAR ID ${c.reasons.join('; ')}`,
    explanation: checksumOnly
      ? `"${r.apaarId}" is 12 digits but fails the checksum (mock) check. Likely a transposed or mistyped digit.`
      : `"${r.apaarId}" ${c.reasons.join('; ')}. APAAR IDs are 12 digits and do not start with 0.`,
    suggestedFix: 'Re-enter the APAAR ID from the student\'s ABC account or DigiLocker profile.',
    confidence: null,
  }];
};

// 2. APAAR_MISSING
export const apaarMissing: Rule = (r) => {
  if (r.apaarId && r.apaarId.trim()) return [];
  return [{
    ruleCode: 'APAAR_MISSING',
    severity: 'BLOCKER',
    message: 'APAAR ID not provided',
    explanation: 'No APAAR ID on this row. Records cannot be verified or deduplicated across institutions without one.',
    suggestedFix: 'Ask the student to generate an APAAR ID in ABC and supply it, then re-upload the row.',
    confidence: null,
  }];
};
