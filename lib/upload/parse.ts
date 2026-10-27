// CSV header mapping and per-row field normalisation. Pure; shared by client (auto-map) and server (validate).
export const FIELDS = [
  { key: 'apaarId', label: 'APAAR ID', required: true, aliases: ['apaar', 'apaarid', 'abcid'] },
  { key: 'fullName', label: 'Student name', required: true, aliases: ['name', 'studentname', 'fullname'] },
  { key: 'dob', label: 'Date of birth', required: true, aliases: ['dob', 'dateofbirth', 'birthdate'] },
  { key: 'gender', label: 'Gender', required: true, aliases: ['gender', 'sex'] },
  { key: 'category', label: 'Category', required: true, aliases: ['category', 'castecategory', 'reservationcategory'] },
  { key: 'guardianName', label: 'Father or guardian name', required: true, aliases: ['fatherguardianname', 'fatherorguardianname', 'guardianname', 'guardian', 'fathername', 'father'] },
  { key: 'admissionType', label: 'Admission type', required: false, aliases: ['admissiontype', 'quota', 'seattype'] },
  { key: 'isNRI', label: 'NRI', required: false, aliases: ['nri', 'isnri'] },
  { key: 'isOCI', label: 'OCI', required: false, aliases: ['oci', 'isoci'] },
  { key: 'isForeignNational', label: 'Foreign national', required: false, aliases: ['foreignnational', 'isforeignnational', 'fn'] },
] as const;
export type FieldKey = (typeof FIELDS)[number]['key'];
export type RawRow = Partial<Record<FieldKey, string>>;
export type Mapping = Record<FieldKey, string>; // canonical key -> CSV header ('' = unmapped)

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

export function autoMap(headers: string[]): Mapping {
  const used = new Set<string>();
  const out = {} as Mapping;
  for (const f of FIELDS) {
    const hit = headers.find((h) => !used.has(h) && (f.aliases as readonly string[]).includes(norm(h))) ?? headers.find((h) => !used.has(h) && (f.aliases as readonly string[]).some((a) => a.length >= 3 && norm(h).startsWith(a)));
    out[f.key] = hit ?? '';
    if (hit) used.add(hit);
  }
  return out;
}

export function applyMapping(rows: Record<string, string>[], m: Mapping): RawRow[] {
  return rows.map((r) => Object.fromEntries(FIELDS.map((f) => [f.key, m[f.key] ? (r[m[f.key]] ?? '').toString().trim() : ''])) as RawRow);
}

export interface ParsedRow {
  apaarId: string | null; fullName: string; dob: Date; gender: string; category: string; guardianName: string;
  admissionType: string; isNRI: boolean; isOCI: boolean; isForeignNational: boolean;
}

const bool = (v?: string) => /^(true|yes|y|1)$/i.test((v ?? '').trim());

export function parseDob(v: string): Date | null {
  let y: number, m: number, d: number;
  let x = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (x) [y, m, d] = [+x[1], +x[2], +x[3]];
  else if ((x = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v))) [d, m, y] = [+x[1], +x[2], +x[3]];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt : null;
}

export function parseRow(r: RawRow): { value?: ParsedRow; errors: string[] } {
  const errors: string[] = [];
  const fullName = (r.fullName ?? '').trim();
  if (!fullName) errors.push('Student name is blank');
  const guardianName = (r.guardianName ?? '').trim();
  if (!guardianName) errors.push('Father or guardian name is blank. It is needed for the duplicate check and is not stored');
  const dob = parseDob((r.dob ?? '').trim());
  if (!dob) errors.push(`Date of birth "${r.dob ?? ''}" is not a valid date. Use YYYY-MM-DD or DD/MM/YYYY`);
  const g = (r.gender ?? '').trim().toLowerCase();
  const gender = g === 'm' || g === 'male' ? 'M' : g === 'f' || g === 'female' ? 'F' : g === 'o' || g === 'other' || g === 't' ? 'O' : '';
  if (!gender) errors.push(`Gender "${r.gender ?? ''}" is not recognised. Use M, F or O`);
  const c = (r.category ?? '').trim().toUpperCase();
  const category = c === 'GENERAL' || c === 'UR' ? 'GEN' : c;
  if (!['GEN', 'OBC', 'SC', 'ST', 'EWS'].includes(category)) errors.push(`Category "${r.category ?? ''}" is not one of GEN, OBC, SC, ST, EWS`);
  const t = (r.admissionType ?? '').trim().toLowerCase();
  const admissionType = !t || t === 'regular' || t === 'general' ? 'regular' : t.startsWith('super') ? 'supernumerary' : t === 'nri' ? 'NRI' : t === 'oci' ? 'OCI' : t === 'fn' || t.startsWith('foreign') ? 'FN' : '';
  if (!admissionType) errors.push(`Admission type "${r.admissionType}" is not one of regular, supernumerary, NRI, OCI, FN`);
  if (errors.length) return { errors };
  const apaar = (r.apaarId ?? '').trim();
  return { errors, value: { apaarId: apaar || null, fullName, dob: dob!, gender, category, guardianName, admissionType, isNRI: bool(r.isNRI), isOCI: bool(r.isOCI), isForeignNational: bool(r.isForeignNational) } };
}
