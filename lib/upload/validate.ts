// Dry-run / commit validation. Pure: all database state is passed in, so this runs identically in tests.
import { validateApaar } from '../apaar';
import { computeFingerprint } from '../fingerprint';
import { ExistingIndex, runRecordRules, type CourseInfo, type CourseYearCounts, type FlagDraft, type RecordInput } from '../rules';
import { parseRow, type RawRow } from './parse';

export interface ValidateArgs {
  rows: RawRow[];
  institutionId: string;
  course: CourseInfo;
  year: string;
  existing: RecordInput[];                                   // every committed record, all institutions
  institutions: Map<string, { id: string; name: string; city: string }>;
  initialCounts: CourseYearCounts;                           // already committed for this course + year
  newId?: () => string;
}
export type RowStatus = 'PASS' | 'REVIEW' | 'FAIL';
export interface RowResult {
  row: number;                       // 1-based data row
  status: RowStatus;
  errors: string[];                  // unparseable fields. Row cannot be stored
  flags: FlagDraft[];
  apaarCheck: { formatOk: boolean; checksumOk: boolean | null } | null;
  display: { apaarId: string; fullName: string; dob: string; category: string; admissionType: string };
  record?: RecordInput;              // present when the row parsed. Used by commit, stripped from preview
}
export interface Summary { total: number; pass: number; review: number; fail: number; unparseable: number; flagged: number; byRule: Record<string, number> }

export function validateBatch(a: ValidateArgs): { results: RowResult[]; summary: Summary } {
  const index = new ExistingIndex();
  a.existing.forEach((r) => index.add(r));
  const counts: CourseYearCounts = { total: a.initialCounts.total, supernumerary: a.initialCounts.supernumerary, regularByCategory: { ...a.initialCounts.regularByCategory } };
  let n = 0;
  const newId = a.newId ?? (() => `tmp_${++n}`);
  const results: RowResult[] = [];
  const byRule: Record<string, number> = {};

  a.rows.forEach((raw, i) => {
    const display = { apaarId: raw.apaarId ?? '', fullName: raw.fullName ?? '', dob: raw.dob ?? '', category: raw.category ?? '', admissionType: raw.admissionType || 'regular' };
    const { value: p, errors } = parseRow(raw);
    if (!p) return results.push({ row: i + 1, status: 'FAIL', errors, flags: [], apaarCheck: null, display });
    const rec: RecordInput = {
      id: newId(), institutionId: a.institutionId, courseId: a.course.id, apaarId: p.apaarId, fullName: p.fullName, dob: p.dob, gender: p.gender, category: p.category,
      isNRI: p.isNRI, isOCI: p.isOCI, isForeignNational: p.isForeignNational, admissionYear: a.year, admissionType: p.admissionType,
      fingerprint: computeFingerprint({ fullName: p.fullName, dob: p.dob, guardianName: p.guardianName, gender: p.gender }),
    };
    counts.total++;
    if (rec.admissionType === 'supernumerary') counts.supernumerary++;
    if (rec.admissionType === 'regular') counts.regularByCategory[rec.category] = (counts.regularByCategory[rec.category] ?? 0) + 1;
    const flags = runRecordRules(rec, { institutions: a.institutions, course: a.course, existing: index, counts });
    index.add(rec);
    flags.forEach((f) => (byRule[f.ruleCode] = (byRule[f.ruleCode] ?? 0) + 1));
    const status: RowStatus = flags.some((f) => f.severity === 'BLOCKER') ? 'FAIL' : flags.some((f) => f.severity === 'WARNING') ? 'REVIEW' : 'PASS';
    const c = p.apaarId ? validateApaar(p.apaarId) : null;
    results.push({ row: i + 1, status, errors: [], flags, apaarCheck: c && { formatOk: c.formatOk, checksumOk: c.checksumOk }, display, record: rec });
  });

  const unparseable = results.filter((r) => !r.record).length;
  return { results, summary: {
    total: results.length, pass: results.filter((r) => r.status === 'PASS').length, review: results.filter((r) => r.status === 'REVIEW').length,
    fail: results.filter((r) => r.status === 'FAIL').length, unparseable, flagged: results.filter((r) => r.record && r.flags.some((f) => f.severity !== 'INFO')).length, byRule } };
}

export const stripForPreview = (results: RowResult[]) => results.map(({ record: _r, ...rest }) => rest);
