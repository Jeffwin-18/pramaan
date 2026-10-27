// Demo batch generator. The guardian name is deliberately not stored in the database, so to build
// rows that really collide with existing students the generator reuses the deterministic seed dataset.
// Every violation below is detected by the live rule engine, not hard-coded.
import { generateApaar, verhoeffCheckDigit } from '../apaar';
import { dobKey, normalizeName } from '../fingerprint';
import { nameSimilarity } from '../fuzzy';
import { buildSeedData, POOLS } from '../../prisma/seed-data';

const HEADERS = ['APAAR ID', 'Student Name', 'DOB (DD/MM/YYYY)', 'Gender', 'Category', 'Father/Guardian Name', 'Admission Type', 'NRI', 'OCI', 'Foreign National'];
const STATE_KEY: Record<string, string> = { Maharashtra: 'MH', 'Tamil Nadu': 'TN', Gujarat: 'GJ' };
let cache: ReturnType<typeof buildSeedData> | null = null;

function rng(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ddmmyyyy = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function buildDemoBatchCsv(institutionId: string, level: 'UG' | 'PG', year: string): string {
  const sd = (cache ??= buildSeedData());
  const r = rng(7);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const inst = sd.institutions.find((i) => i.id === institutionId)!;
  const pool = POOLS[STATE_KEY[inst.state]];
  const start = parseInt(year.slice(0, 4), 10);
  const takenNames = new Set(sd.records.map((x) => x.fullName)), takenDob = new Set(sd.records.map((x) => dobKey(x.dob)));
  const freshApaar = () => generateApaar(r);

  type Row = { apaar: string; name: string; dob: Date; gender: string; cat: string; guardian: string; type?: string; nri?: boolean; oci?: boolean };
  const rows: Row[] = [];
  const person = () => {
    for (;;) {
      const female = r() < 0.45, first = pick(female ? pool.female : pool.male), sur = pick(pool.surnames), g = pick(pool.male);
      const name = `${first} ${sur}`;
      const age = level === 'UG' ? 17 + Math.floor(r() * 3) : 21 + Math.floor(r() * 5);
      const dob = new Date(Date.UTC(start - age, Math.floor(r() * 12), 1 + Math.floor(r() * 28)));
      if (takenNames.has(name) || takenDob.has(dobKey(dob))) continue;
      takenNames.add(name); takenDob.add(dobKey(dob));
      return { name, dob, gender: female ? 'F' : 'M', guardian: `${g} ${sur}` };
    }
  };
  // clean rows (three ST so a small course trips CATEGORY_MISMATCH)
  ['GEN', 'OBC', 'ST', 'ST', 'ST'].forEach((cat) => { const p = person(); rows.push({ apaar: freshApaar(), name: p.name, dob: p.dob, gender: p.gender, cat, guardian: p.guardian }); });
  // malformed APAAR: wrong length, checksum, missing
  { const p = person(); rows.push({ apaar: freshApaar().slice(0, 11), name: p.name, dob: p.dob, gender: p.gender, cat: 'GEN', guardian: p.guardian }); }
  { const p = person(); const a = freshApaar(); rows.push({ apaar: a.slice(0, 11) + String((+a[11] + 4) % 10), name: p.name, dob: p.dob, gender: p.gender, cat: 'OBC', guardian: p.guardian }); }
  { const p = person(); rows.push({ apaar: '', name: p.name, dob: p.dob, gender: p.gender, cat: 'GEN', guardian: p.guardian }); }
  // exact duplicate of an existing student at this institution; and of a student at another institution
  const clean = (x: (typeof sd.records)[number]) => x.status === 'VERIFIED' && !!x.apaarId && x.admissionType === 'regular';
  const mine = sd.records.filter((x) => x.institutionId === institutionId && clean(x) && x.admissionYear === '2024-25');
  const other = sd.records.filter((x) => x.institutionId !== institutionId && clean(x) && x.admissionYear === '2024-25');
  const d1 = mine[3], d2 = other[5], nm = mine[11];
  rows.push({ apaar: d1.apaarId!, name: d1.fullName, dob: d1.dob, gender: d1.gender, cat: d1.category, guardian: d1.guardian });
  rows.push({ apaar: freshApaar(), name: d2.fullName, dob: d2.dob, gender: d2.gender, cat: d2.category, guardian: d2.guardian });
  // near-match: spelling variant of an existing student, same DOB, confidence in 0.75-0.90
  for (let k = 0; k < 400; k++) {
    const toks = nm.fullName.split(' '); const ti = Math.floor(r() * toks.length); const w = toks[ti];
    if (w.length < 4) continue;
    const i = 1 + Math.floor(r() * (w.length - 2));
    toks[ti] = r() < 0.5 ? w.slice(0, i) + w[i] + w.slice(i) : w.slice(0, i) + w.slice(i + 1);
    if (r() < 0.5) toks[ti] = toks[ti].slice(0, 1) + toks[ti].slice(1).replace(/[aeiou]/, 'e');
    const name = toks.join(' ');
    const s = nameSimilarity(normalizeName(nm.fullName), normalizeName(name));
    if (name !== nm.fullName && s >= 0.75 && s <= 0.9) { rows.push({ apaar: freshApaar(), name, dob: nm.dob, gender: nm.gender, cat: nm.category, guardian: nm.guardian }); break; }
  }
  // implausible DOB, OCI holder entered as regular
  { const p = person(); rows.push({ apaar: freshApaar(), name: p.name, dob: new Date(Date.UTC(start - 11, 5, 21)), gender: p.gender, cat: 'GEN', guardian: p.guardian }); }
  { const p = person(); rows.push({ apaar: freshApaar(), name: p.name, dob: p.dob, gender: p.gender, cat: 'GEN', guardian: p.guardian, oci: true }); }

  const shuffled = rows.map((x) => [r(), x] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const lines = shuffled.map((x) => [x.apaar, x.name, ddmmyyyy(x.dob), x.gender, x.cat, x.guardian, x.type ?? 'Regular', x.nri ? 'Yes' : 'No', x.oci ? 'Yes' : 'No', 'No'].map(csvCell).join(','));
  return [HEADERS.join(','), ...lines].join('\n') + '\n';
}

export function sampleCsv(): string {
  const mk = (p: string) => p + verhoeffCheckDigit(p);
  return ['apaar_id,full_name,dob,gender,category,father_or_guardian_name,admission_type,is_nri,is_oci,is_foreign_national',
    `${mk('38475920164')},Aditi Raman,2007-03-14,F,GEN,Suresh Raman,regular,false,false,false`,
    `${mk('52916407283')},Karan Mehra,2006-11-02,M,OBC,Vinod Mehra,regular,false,false,false`,
    `${mk('71640382951')},Farah Sheikh,2007-08-27,F,EWS,Imtiaz Sheikh,supernumerary,false,false,false`].join('\n') + '\n';
}
