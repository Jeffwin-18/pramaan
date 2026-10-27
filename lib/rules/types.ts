import { dobKey, normalizeName } from '../fingerprint';

export type Severity = 'BLOCKER' | 'WARNING' | 'INFO';

export interface RecordInput {
  id: string;
  institutionId: string;
  courseId: string;
  apaarId: string | null;
  fullName: string;
  dob: Date;
  gender: string;
  category: string;
  isNRI: boolean;
  isOCI: boolean;
  isForeignNational: boolean;
  admissionYear: string; // "2025-26"
  admissionType: string; // regular | supernumerary | NRI | OCI | FN
  fingerprint: string;
}

export interface FlagDraft {
  ruleCode: string;
  severity: Severity;
  message: string;
  explanation: string;
  suggestedFix: string;
  confidence: number | null;
  relatedRecordId?: string | null;
}

export interface CourseInfo {
  id: string;
  name: string;
  approvedIntake: number;
  supernumerarySeats: number;
  declaredCategorySeats: Record<string, number>;
}

// Counts for this record's course + admission year, INCLUDING this record,
// taken in commit order. A record is flagged when it is the one that pushes a count over its limit.
export interface CourseYearCounts {
  total: number;
  supernumerary: number;
  regularByCategory: Record<string, number>;
}

export interface RuleContext {
  institutions: Map<string, { id: string; name: string; city: string }>;
  course: CourseInfo;
  existing: ExistingIndex;
  counts: CourseYearCounts;
}

export type Rule = (record: RecordInput, ctx: RuleContext) => FlagDraft[];

// Records already committed (or earlier in the same batch). Excludes the record under test.
export class ExistingIndex {
  byApaar = new Map<string, RecordInput[]>();
  byFingerprint = new Map<string, RecordInput[]>();
  byDob = new Map<string, RecordInput[]>();

  add(r: RecordInput) {
    if (r.apaarId) push(this.byApaar, r.apaarId, r);
    push(this.byFingerprint, r.fingerprint, r);
    push(this.byDob, dobKey(r.dob), r);
  }
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const a = m.get(k);
  if (a) a.push(v);
  else m.set(k, [v]);
}

export { normalizeName };
