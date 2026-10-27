import { nameSimilarity } from '../fuzzy';
import { dobKey, normalizeName } from '../fingerprint';
import type { Rule, RecordInput, RuleContext } from './types';

const where = (r: RecordInput, ctx: RuleContext) => {
  const inst = ctx.institutions.get(r.institutionId);
  return `${inst?.name ?? 'another institution'} (admitted ${r.admissionYear.slice(0, 4)})`;
};

function matches(r: RecordInput, ctx: RuleContext): { rec: RecordInput; byFingerprint: boolean }[] {
  const out = new Map<string, { rec: RecordInput; byFingerprint: boolean }>();
  for (const e of ctx.existing.byFingerprint.get(r.fingerprint) ?? []) out.set(e.id, { rec: e, byFingerprint: true });
  if (r.apaarId) for (const e of ctx.existing.byApaar.get(r.apaarId) ?? []) if (!out.has(e.id)) out.set(e.id, { rec: e, byFingerprint: false });
  return [...out.values()];
}

// 3. DUPLICATE_WITHIN_INSTITUTION (same APAAR or same fingerprint)
export const duplicateWithinInstitution: Rule = (r, ctx) => {
  const m = matches(r, ctx).filter((x) => x.rec.institutionId === r.institutionId);
  if (!m.length) return [];
  const first = m[0];
  return [{
    ruleCode: 'DUPLICATE_WITHIN_INSTITUTION',
    severity: 'BLOCKER',
    message: first.byFingerprint ? 'Same student identity already recorded at this institution' : 'APAAR ID already recorded at this institution',
    explanation: `This ${first.byFingerprint ? 'identity fingerprint' : 'APAAR ID'} already exists at ${where(first.rec, ctx)}. Likely a double entry or a re-upload of the same student.`,
    suggestedFix: 'Keep the earlier record and reject this row, or correct the identity fields if these are different students.',
    confidence: first.byFingerprint ? 1 : 0.9,
    relatedRecordId: first.rec.id,
  }];
};

// 4. DUPLICATE_ACROSS_INSTITUTIONS (same fingerprint, different institution)
export const duplicateAcrossInstitutions: Rule = (r, ctx) => {
  const m = (ctx.existing.byFingerprint.get(r.fingerprint) ?? []).filter((e) => e.institutionId !== r.institutionId);
  if (!m.length) return [];
  return [{
    ruleCode: 'DUPLICATE_ACROSS_INSTITUTIONS',
    severity: 'WARNING',
    message: 'Same student identity present at another institution',
    explanation: `This student already exists at ${where(m[0], ctx)}. Possible transfer case or data entry error. Concurrent enrolment at two institutions is not permitted.`,
    suggestedFix: 'Confirm with both institutions whether the earlier seat was released. Escalate to the regional office if both are active.',
    confidence: 1,
    relatedRecordId: m[0].id,
  }];
};

export const NEAR_MATCH_THRESHOLD = 0.7;

// 10. NAME_NEAR_MATCH_EXISTING (fuzzy name + exact DOB, different fingerprint). Routes to human review.
export const nameNearMatchExisting: Rule = (r, ctx) => {
  const cands = (ctx.existing.byDob.get(dobKey(r.dob)) ?? []).filter((e) => e.fingerprint !== r.fingerprint && e.gender === r.gender);
  const me = normalizeName(r.fullName);
  let best: { rec: RecordInput; score: number } | null = null;
  for (const e of cands) {
    const score = nameSimilarity(me, normalizeName(e.fullName));
    if (score >= NEAR_MATCH_THRESHOLD && (!best || score > best.score)) best = { rec: e, score };
  }
  if (!best) return [];
  const conf = Math.round(best.score * 100) / 100;
  return [{
    ruleCode: 'NAME_NEAR_MATCH_EXISTING',
    severity: 'WARNING',
    message: `Possible duplicate, confidence ${conf.toFixed(2)}`,
    explanation: `Name "${r.fullName}" closely matches "${best.rec.fullName}" at ${where(best.rec, ctx)} with the same date of birth and gender. Possible duplicate with a spelling variation.`,
    suggestedFix: 'Review both records side by side. Resolve if they are different students; otherwise treat as a duplicate.',
    confidence: conf,
    relatedRecordId: best.rec.id,
  }];
};
