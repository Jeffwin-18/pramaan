// All institutions and students are fictional; data is synthetic for demo purposes.
//
// Builds the complete demo dataset in memory (no DB access) so it can be inspected and tested
// on its own. prisma/seed.ts writes the result through Prisma.
// Flags are NOT hand-written: every record is pushed through the real rule engine in commit order.
import { createHash } from 'crypto';
import { generateApaar, validateApaar } from '../lib/apaar';
import { computeFingerprint, dobKey, normalizeName } from '../lib/fingerprint';
import { nameSimilarity } from '../lib/fuzzy';
import { ExistingIndex, institutionRules, runRecordRules, type CourseInfo, type FlagDraft, type RecordInput } from '../lib/rules';
import { computeRiskScores } from '../lib/risk';

// ---------- deterministic randomness ----------
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
let rnd = mulberry32(20260223);
const rint = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pickOne = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
function shuffle<T>(a: T[]): T[] { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }

// ---------- name pools (fictional combinations) ----------
type Pool = { male: string[]; female: string[]; surnames: string[] };
export const POOLS: Record<string, Pool> = {
  MH: {
    male: ['Rohan', 'Omkar', 'Tejas', 'Prathamesh', 'Siddhesh', 'Akshay', 'Swapnil', 'Nikhil', 'Pranav', 'Chinmay', 'Saurabh', 'Aniket', 'Yogesh', 'Mandar'],
    female: ['Sneha', 'Pooja', 'Shruti', 'Gauri', 'Mayuri', 'Vaishnavi', 'Rutuja', 'Ketaki', 'Apurva', 'Manasi', 'Snehal', 'Madhura', 'Isha', 'Tanvi'],
    surnames: ['Deshmukh', 'Patil', 'Kulkarni', 'Joshi', 'Pawar', 'Shinde', 'Jadhav', 'Gokhale', 'Bhosale', 'Kadam', 'Phadke', 'Chavan', 'Sawant', 'Gaikwad', 'Apte', 'Deshpande'],
  },
  TN: {
    male: ['Arun', 'Karthik', 'Vignesh', 'Surya', 'Dinesh', 'Gokul', 'Saravanan', 'Ashwin', 'Hariharan', 'Bharath', 'Muthu', 'Prakash', 'Naveen', 'Sriram'],
    female: ['Divya', 'Meenakshi', 'Harini', 'Priyanka', 'Lakshmi', 'Nandhini', 'Keerthana', 'Pavithra', 'Sowmya', 'Abinaya', 'Revathi', 'Janani', 'Kavya', 'Aishwarya'],
    surnames: ['Subramanian', 'Ramanathan', 'Krishnan', 'Venkatesh', 'Murugan', 'Natarajan', 'Selvam', 'Raman', 'Iyer', 'Pillai', 'Balasubramanian', 'Sundaram', 'Chandran', 'Annamalai', 'Palanisamy', 'Rajendran'],
  },
  GJ: {
    male: ['Hardik', 'Jigar', 'Nisarg', 'Dhruv', 'Parth', 'Kunal', 'Ankit', 'Mehul', 'Yash', 'Chirag', 'Smit', 'Vatsal', 'Jay', 'Harsh'],
    female: ['Krupa', 'Hetal', 'Riddhi', 'Zalak', 'Foram', 'Bhavya', 'Khushbu', 'Dhara', 'Jinal', 'Maitri', 'Nidhi', 'Komal', 'Hiral', 'Krina'],
    surnames: ['Patel', 'Shah', 'Desai', 'Mehta', 'Trivedi', 'Joshi', 'Parmar', 'Solanki', 'Vyas', 'Thakkar', 'Gandhi', 'Rathod', 'Chauhan', 'Modi', 'Bhatt', 'Dave', 'Pandya'],
  },
};

// ---------- institutions and courses ----------
interface CourseSpec { name: string; level: 'UG' | 'PG'; intake: number; ss: number; enr: Record<string, number> }
interface InstSpec { id: string; slug: string; name: string; aicteId: string; type: string; state: string; stateKey: string; city: string; courses: CourseSpec[] }
const Y1 = '2024-25', Y2 = '2025-26';
const YEARS = [Y1, Y2];

const INSTS: InstSpec[] = [
  { id: 'inst_sanjeevani', slug: 'sanjeevani', name: 'Sanjeevani Institute of Management, Pune', aicteId: '1-4820917', type: 'PGDM', state: 'Maharashtra', stateKey: 'MH', city: 'Pune', courses: [
    { name: 'PGDM (General)', level: 'PG', intake: 18, ss: 2, enr: { [Y1]: 16, [Y2]: 16 } },
    { name: 'PGDM (Marketing)', level: 'PG', intake: 12, ss: 1, enr: { [Y1]: 11, [Y2]: 11 } },
    { name: 'PGDM (Finance)', level: 'PG', intake: 12, ss: 1, enr: { [Y1]: 11, [Y2]: 11 } },
    { name: 'PGDM (Business Analytics)', level: 'PG', intake: 8, ss: 1, enr: { [Y1]: 7, [Y2]: 8 } } ] },
  { id: 'inst_kaveri', slug: 'kaveri', name: 'Kaveri School of Engineering, Coimbatore', aicteId: '1-5173308', type: 'Engineering', state: 'Tamil Nadu', stateKey: 'TN', city: 'Coimbatore', courses: [
    { name: 'B.E. Computer Science and Engineering', level: 'UG', intake: 16, ss: 1, enr: { [Y1]: 15, [Y2]: 18 } },
    { name: 'B.E. Mechanical Engineering', level: 'UG', intake: 14, ss: 1, enr: { [Y1]: 13, [Y2]: 16 } },
    { name: 'B.E. Electronics and Communication', level: 'UG', intake: 14, ss: 1, enr: { [Y1]: 13, [Y2]: 16 } },
    { name: 'B.E. Civil Engineering', level: 'UG', intake: 10, ss: 0, enr: { [Y1]: 9, [Y2]: 9 } } ] },
  { id: 'inst_sabarmati', slug: 'sabarmati', name: 'Sabarmati Institute of Technology, Ahmedabad', aicteId: '1-6291455', type: 'Engineering', state: 'Gujarat', stateKey: 'GJ', city: 'Ahmedabad', courses: [
    { name: 'B.E. Computer Engineering', level: 'UG', intake: 14, ss: 1, enr: { [Y1]: 14, [Y2]: 14 } },
    { name: 'B.E. Information Technology', level: 'UG', intake: 10, ss: 1, enr: { [Y1]: 10, [Y2]: 10 } },
    { name: 'B.E. Mechanical Engineering', level: 'UG', intake: 8, ss: 0, enr: { [Y1]: 8, [Y2]: 8 } },
    { name: 'B.E. Electronics and Communication', level: 'UG', intake: 8, ss: 0, enr: { [Y1]: 8, [Y2]: 8 } } ] },
  { id: 'inst_narmada', slug: 'narmada', name: 'Narmada College of Pharmacy, Vadodara', aicteId: '1-7340268', type: 'Pharmacy', state: 'Gujarat', stateKey: 'GJ', city: 'Vadodara', courses: [
    { name: 'B.Pharm', level: 'UG', intake: 16, ss: 1, enr: { [Y1]: 15, [Y2]: 15 } },
    { name: 'M.Pharm (Pharmaceutics)', level: 'PG', intake: 6, ss: 0, enr: { [Y1]: 5, [Y2]: 5 } },
    { name: 'M.Pharm (Pharmacology)', level: 'PG', intake: 6, ss: 0, enr: { [Y1]: 5, [Y2]: 6 } },
    { name: 'Pharm.D', level: 'UG', intake: 8, ss: 1, enr: { [Y1]: 7, [Y2]: 7 } } ] },
  { id: 'inst_vaigai', slug: 'vaigai', name: 'Vaigai Institute of Management Studies, Madurai', aicteId: '1-8452091', type: 'Management', state: 'Tamil Nadu', stateKey: 'TN', city: 'Madurai', courses: [
    { name: 'MBA (General)', level: 'PG', intake: 20, ss: 2, enr: { [Y1]: 18, [Y2]: 19 } },
    { name: 'MBA (Human Resources)', level: 'PG', intake: 10, ss: 1, enr: { [Y1]: 9, [Y2]: 9 } },
    { name: 'MBA (Finance)', level: 'PG', intake: 10, ss: 1, enr: { [Y1]: 9, [Y2]: 9 } } ] },
];

const CAT_PCT: Record<string, number> = { GEN: 0.405, OBC: 0.27, SC: 0.15, ST: 0.075, EWS: 0.1 };
function allocate(total: number): Record<string, number> {
  const keys = Object.keys(CAT_PCT);
  const raw = keys.map((k) => CAT_PCT[k] * total);
  const out = raw.map(Math.floor);
  let rem = total - out.reduce((a, b) => a + b, 0);
  raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).slice(0, rem).forEach(([, i]) => out[i]++);
  return Object.fromEntries(keys.map((k, i) => [k, out[i]]));
}
// Declared seat matrix covers approved intake + supernumerary.
const declaredFor = (c: CourseSpec) => allocate(c.intake + c.ss);

// ---------- internal record type ----------
interface Rec extends RecordInput { guardian: string; instIdx: number; courseIdx: number; seq: number; status: string; batchId: string; createdAt: Date; updatedAt: Date }

const apaarSet = new Set<string>();
const newApaar = () => { for (;;) { const a = generateApaar(rnd); if (!apaarSet.has(a)) { apaarSet.add(a); return a; } } };
const dobSet = new Set<string>();
const nameSet = new Set<string>();

function genPerson(stateKey: string, level: 'UG' | 'PG', year: string) {
  const pool = POOLS[stateKey];
  const start = parseInt(year.slice(0, 4), 10);
  for (let tries = 0; ; tries++) {
    const female = rnd() < 0.42;
    const first = pickOne(female ? pool.female : pool.male);
    const sur = pickOne(pool.surnames);
    const gFirst = pickOne(pool.male);
    const fullName = rnd() < 0.4 ? `${first} ${gFirst} ${sur}` : `${first} ${sur}`;
    const [a, b] = level === 'UG' ? [17, 19] : [21, 26];
    const dob = new Date(Date.UTC(start - rint(a, b), rint(0, 11), rint(1, 28)));
    if ((nameSet.has(fullName) || dobSet.has(dobKey(dob))) && tries < 200) continue;
    nameSet.add(fullName); dobSet.add(dobKey(dob));
    return { fullName, guardian: `${gFirst} ${sur}`, gender: female ? 'F' : 'M', dob };
  }
}

const recs: Rec[] = [];
const courseId = (i: InstSpec, ci: number) => `crs_${i.slug}_${ci + 1}`;

function genCourseYear(ii: number, ci: number, year: string, nSsOverride?: number) {
  const inst = INSTS[ii], course = inst.courses[ci], n = course.enr[year];
  const declared = declaredFor(course);
  const slots = shuffle(Object.entries(declared).flatMap(([k, v]) => Array(v).fill(k) as string[]));
  let nSs = nSsOverride ?? (course.ss > 0 ? rint(0, course.ss) : 0);
  let nNri = n >= 12 ? rint(0, 1) : 0;
  const nOci = n >= 14 && rnd() < 0.35 ? 1 : 0;
  const nFn = n >= 14 && rnd() < 0.2 ? 1 : 0;
  while (n - nSs - nNri - nOci - nFn > slots.length) nNri++; // over-intake courses: surplus seats are quota admissions, not category overflow
  const nReg = n - nSs - nNri - nOci - nFn;
  const types = shuffle([...Array(nSs).fill('supernumerary'), ...Array(nNri).fill('NRI'), ...Array(nOci).fill('OCI'), ...Array(nFn).fill('FN'), ...Array(nReg).fill('regular')] as string[]);
  const regCats = slots.slice(0, nReg);
  const batchDate = year === Y1 ? daysAgo(330 + ii * 3) : daysAgo(5 + ii * 4);
  types.forEach((t, seq) => {
    const p = genPerson(inst.stateKey, course.level, year);
    recs.push({
      id: '', institutionId: inst.id, courseId: courseId(inst, ci), apaarId: newApaar(), fullName: p.fullName, guardian: p.guardian, dob: p.dob, gender: p.gender,
      category: t === 'regular' ? regCats.pop()! : t === 'supernumerary' ? pickOne(['GEN', 'OBC', 'GEN', 'EWS']) : 'GEN',
      isNRI: t === 'NRI', isOCI: t === 'OCI', isForeignNational: t === 'FN', admissionYear: year, admissionType: t, fingerprint: '',
      instIdx: ii, courseIdx: ci, seq, status: 'VERIFIED', batchId: `bat_${inst.slug}_${year.slice(0, 4)}`, createdAt: new Date(batchDate.getTime() + seq * 1000), updatedAt: batchDate,
    });
  });
}

let NOW = new Date();
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000 - 3 * 3600000);

export function buildSeedData(now = new Date()) {
  NOW = now; rnd = mulberry32(20260223); // reset so repeated builds are identical
  recs.length = 0; apaarSet.clear(); dobSet.clear(); nameSet.clear();

  // 1. clean population with the engineered capacity violations built in
  for (const y of YEARS) INSTS.forEach((inst, ii) => inst.courses.forEach((_, ci) => {
    let ssOv: number | undefined;
    if (y === Y2 && inst.slug === 'sanjeevani' && ci === 0) ssOv = 4;   // sanctioned 2 -> SUPERNUMERARY_EXCEEDED x2
    if (y === Y2 && inst.slug === 'vaigai' && ci === 0) ssOv = 3;       // sanctioned 2 -> SUPERNUMERARY_EXCEEDED x1
    genCourseYear(ii, ci, y, ssOv);
  }));
  recs.sort((a, b) => a.admissionYear.localeCompare(b.admissionYear) || a.instIdx - b.instIdx || a.courseIdx - b.courseIdx || a.seq - b.seq);
  recs.forEach((r, i) => (r.id = `rec_${String(i + 1).padStart(4, '0')}`));

  // 2. engineered violations
  const used = new Set<Rec>();
  const take = (f: (r: Rec) => boolean): Rec => {
    const pool = recs.filter((r) => !used.has(r) && f(r));
    if (!pool.length) throw new Error('override pool exhausted');
    const r = pool[Math.floor(rnd() * pool.length)]; used.add(r); return r;
  };
  const inst = (r: Rec) => INSTS[r.instIdx].slug;
  const clone = (t: Rec, s: Rec, keepApaar: boolean) => { t.fullName = s.fullName; t.guardian = s.guardian; t.gender = s.gender; t.dob = new Date(s.dob); t.apaarId = keepApaar ? s.apaarId : newApaar(); };
  const reg = (r: Rec) => r.admissionType === 'regular';

  // 6 exact duplicates within an institution (2024-25 record re-entered in 2025-26)
  ['sabarmati', 'sabarmati', 'sanjeevani', 'kaveri', 'narmada', 'vaigai'].forEach((slug, k) => {
    const s = take((r) => inst(r) === slug && r.admissionYear === Y1 && reg(r));
    const t = take((r) => inst(r) === slug && r.admissionYear === Y2 && reg(r));
    clone(t, s, k < 4);
  });
  // 4 cross-institution duplicates
  [['sanjeevani', 'vaigai'], ['kaveri', 'sabarmati'], ['sabarmati', 'kaveri'], ['narmada', 'sabarmati']].forEach(([from, to], k) => {
    const s = take((r) => inst(r) === from && r.admissionYear === Y1 && reg(r));
    const t = take((r) => inst(r) === to && r.admissionYear === Y2 && reg(r));
    clone(t, s, k < 2);
  });
  // 5 fuzzy near-matches, confidence engineered into 0.72-0.91 by selecting from generated spelling variants
  const editWord = (w: string) => {
    if (w.length < 4) return w;
    const i = 1 + Math.floor(rnd() * (w.length - 2));
    switch (rint(0, 3)) {
      case 0: return w.slice(0, i) + pickOne('aeiouy'.split('')) + w.slice(i + 1);
      case 1: return w.slice(0, i) + w.slice(i + 1);
      case 2: return w.slice(0, i) + w[i] + w.slice(i);
      default: return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
    }
  };
  const cands: { src: Rec; name: string; conf: number }[] = [];
  for (const src of recs.filter((r) => !used.has(r) && r.admissionYear === Y1 && reg(r))) {
    const toks = src.fullName.split(' ');
    for (let k = 0; k < 14; k++) {
      const t = [...toks]; const ti = rint(0, t.length - 1);
      for (let j = rint(1, 3); j > 0; j--) t[ti] = editWord(t[ti]);
      const name = t.join(' ');
      if (name === src.fullName) continue;
      cands.push({ src, name, conf: Math.round(nameSimilarity(normalizeName(src.fullName), normalizeName(name)) * 100) / 100 });
    }
    if (toks.length === 3) { const name = `${toks[0]} ${toks[2]}`; cands.push({ src, name, conf: Math.round(nameSimilarity(normalizeName(src.fullName), normalizeName(name)) * 100) / 100 }); }
  }
  for (const want of [0.74, 0.79, 0.84, 0.88, 0.91]) {
    const best = cands.filter((c) => !used.has(c.src) && c.conf >= 0.72 && c.conf <= 0.91).sort((a, b) => Math.abs(a.conf - want) - Math.abs(b.conf - want))[0];
    if (!best) throw new Error('no fuzzy candidate near ' + want);
    used.add(best.src);
    const t = take((r) => r.admissionYear === Y2 && reg(r));
    clone(t, best.src, false); t.fullName = best.name;
  }
  // 12 malformed APAAR IDs (5 wrong length, 3 leading zero, 2 non-digit, 2 checksum) + 4 missing
  const kinds = ['len', 'len', 'len', 'len', 'len', 'zero', 'zero', 'zero', 'alpha', 'alpha', 'sum', 'sum'];
  ['sabarmati', 'sabarmati', 'sabarmati', 'sabarmati', 'kaveri', 'kaveri', 'kaveri', 'sanjeevani', 'sanjeevani', 'narmada', 'vaigai', 'vaigai'].forEach((slug, k) => {
    const r = take((x) => inst(x) === slug && reg(x)); const a = r.apaarId!;
    r.apaarId = { len: k % 2 ? a + '7' : a.slice(0, 11), zero: '0' + a.slice(1), alpha: a.slice(0, 3) + (k % 2 ? 'O' : 'X') + a.slice(4), sum: a.slice(0, 11) + String((+a[11] + 3) % 10) }[kinds[k]]!;
  });
  ['sabarmati', 'kaveri', 'narmada', 'vaigai'].forEach((slug) => { take((x) => inst(x) === slug && reg(x)).apaarId = null; });
  // 3 residency / admission-type inconsistencies (spec lists 2; a third keeps every rule at >= 3 firings)
  { const r = take((x) => inst(x) === 'kaveri' && reg(x)); r.isOCI = true; }
  { const r = take((x) => inst(x) === 'sabarmati' && reg(x)); r.isNRI = true; }
  { const r = take((x) => inst(x) === 'vaigai' && reg(x)); r.isForeignNational = true; }
  // 3 implausible dates of birth
  [['sabarmati', 11], ['sanjeevani', 68], ['narmada', 13]].forEach(([slug, age], k) => {
    const r = take((x) => inst(x) === slug && x.admissionYear === Y2 && reg(x));
    let d = 10 + k; let dob = new Date(Date.UTC(2025 - (age as number), 3, d));
    while (dobSet.has(dobKey(dob))) dob = new Date(Date.UTC(2025 - (age as number), 3, ++d));
    dobSet.add(dobKey(dob)); r.dob = dob;
  });
  // 4 category overflows: push ST count one above the declared matrix for the course-year
  [['sanjeevani', 2], ['narmada', 0], ['sabarmati', 1], ['vaigai', 1]].forEach(([slug, ci]) => {
    const ii = INSTS.findIndex((i) => i.slug === slug); const course = INSTS[ii].courses[ci as number];
    const cid = courseId(INSTS[ii], ci as number);
    const cy = recs.filter((r) => r.courseId === cid && r.admissionYear === Y2 && reg(r));
    let need = (declaredFor(course).ST ?? 0) + 1 - cy.filter((r) => r.category === 'ST').length;
    for (const r of shuffle(cy.filter((r) => !used.has(r) && r.category !== 'ST'))) { if (need-- <= 0) break; r.category = 'ST'; used.add(r); }
  });

  // 3. fingerprints, computed last so overrides are reflected
  for (const r of recs) r.fingerprint = computeFingerprint({ fullName: r.fullName, dob: r.dob, guardianName: r.guardian, gender: r.gender });

  // 4. run the real rule engine in commit order
  const instMap = new Map(INSTS.map((i) => [i.id, { id: i.id, name: i.name, city: i.city }]));
  const courseInfo = new Map<string, CourseInfo>();
  INSTS.forEach((i) => i.courses.forEach((c, ci) => courseInfo.set(courseId(i, ci), { id: courseId(i, ci), name: c.name, approvedIntake: c.intake, supernumerarySeats: c.ss, declaredCategorySeats: declaredFor(c) })));
  const index = new ExistingIndex();
  const counts = new Map<string, { total: number; supernumerary: number; regularByCategory: Record<string, number> }>();
  type FlagRow = FlagDraft & { id: string; recordId: string | null; institutionId: string; status: string; createdAt: Date; resolvedAt: Date | null; resolvedById: string | null; resolutionNote: string | null };
  const flags: FlagRow[] = [];
  const mk = (d: FlagDraft, recordId: string | null, institutionId: string, createdAt: Date): FlagRow => ({ ...d, relatedRecordId: d.relatedRecordId ?? null, id: `flg_${String(flags.length + 1).padStart(4, '0')}`, recordId, institutionId, status: 'OPEN', createdAt, resolvedAt: null, resolvedById: null, resolutionNote: null });
  for (const r of recs) {
    const key = `${r.courseId}|${r.admissionYear}`;
    const c = counts.get(key) ?? { total: 0, supernumerary: 0, regularByCategory: {} };
    c.total++; if (r.admissionType === 'supernumerary') c.supernumerary++;
    if (r.admissionType === 'regular') c.regularByCategory[r.category] = (c.regularByCategory[r.category] ?? 0) + 1;
    counts.set(key, c);
    for (const d of runRecordRules(r, { institutions: instMap, course: courseInfo.get(r.courseId)!, existing: index, counts: c })) flags.push(mk(d, r.id, r.institutionId, new Date(r.createdAt.getTime() + 60000)));
    index.add(r);
  }
  // institution-level flags
  const yearStats = INSTS.map((i) => YEARS.map((y) => ({ year: y, enrolled: recs.filter((r) => r.institutionId === i.id && r.admissionYear === y).length, approved: i.courses.reduce((s, c) => s + c.intake, 0), supernumerary: i.courses.reduce((s, c) => s + c.ss, 0) })));
  INSTS.forEach((i, ii) => institutionRules(i.name, yearStats[ii]).forEach((d) => flags.push(mk(d, null, i.id, daysAgo(4 + ii * 4)))));

  // 5. statuses, resolutions, escalations, rejections (each has a matching audit row below)
  const byId = new Map(recs.map((r) => [r.id, r]));
  const open = (r: Rec) => flags.some((f) => f.recordId === r.id && f.status !== 'RESOLVED' && f.severity !== 'INFO');
  for (const r of recs) if (open(r)) r.status = 'FLAGGED';

  const users = [
    { id: 'usr_aicte', email: 'aicte.admin@demo.aicte.example', name: 'Anita Rao', role: 'AICTE_ADMIN', organisation: 'AICTE Regional Office (demo)', institutionId: null as string | null },
    ...INSTS.map((i) => ({ id: `usr_inst_${i.slug}`, email: `inst.${i.slug}@demo.aicte.example`, name: `Registrar, ${i.name.split(',')[0]}`, role: 'INSTITUTION_ADMIN', organisation: i.name, institutionId: i.id })),
    { id: 'usr_ver_hr', email: 'hr.verifier@talentbridge.example', name: 'Meera Nambiar', role: 'VERIFIER', organisation: 'Talentbridge Staffing (demo employer)', institutionId: null },
    { id: 'usr_ver_reg', email: 'regulator@statecouncil.example', name: 'Imran Qureshi', role: 'VERIFIER', organisation: 'State Technical Education Council (demo regulator)', institutionId: null },
    { id: 'usr_auditor', email: 'auditor@demo.aicte.example', name: 'S. Gopalakrishnan', role: 'AUDITOR', organisation: 'Internal Audit (demo)', institutionId: null },
  ];
  const instUser = (id: string) => `usr_inst_${INSTS.find((i) => i.id === id)!.slug}`;
  const ofRule = (code: string) => flags.filter((f) => f.ruleCode === code && f.recordId);
  const audit: { id: string; actorUserId: string; actorRole: string; action: string; entityType: string; entityId: string; beforeJson: string | null; afterJson: string | null; ip: string; createdAt: Date }[] = [];
  const log = (actor: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown, at: Date) =>
    audit.push({ id: `aud_${String(audit.length + 1).padStart(4, '0')}`, actorUserId: actor, actorRole: users.find((u) => u.id === actor)!.role, action, entityType, entityId, beforeJson: before ? JSON.stringify(before) : null, afterJson: after ? JSON.stringify(after) : null, ip: `10.20.${rint(1, 40)}.${rint(2, 250)}`, createdAt: at });

  const resolve = (f: FlagRow, by: string, note: string, d: number) => {
    f.status = 'RESOLVED'; f.resolvedAt = daysAgo(d); f.resolvedById = by; f.resolutionNote = note;
    log(by, 'FLAG_RESOLVE', 'Flag', f.id, { status: 'OPEN' }, { status: 'RESOLVED', ruleCode: f.ruleCode, note }, f.resolvedAt);
    const r = byId.get(f.recordId!)!; if (!open(r)) r.status = 'VERIFIED';
  };
  const near = ofRule('NAME_NEAR_MATCH_EXISTING').sort((a, b) => a.confidence! - b.confidence!);
  resolve(near[0], instUser(near[0].institutionId), 'Different student confirmed from Class X certificates. Names are spelled differently in the school record.', 9);
  resolve(near[1], instUser(near[1].institutionId), 'Same student, spelling corrected in the next upload. Earlier row withdrawn.', 7);
  const cross = ofRule('DUPLICATE_ACROSS_INSTITUTIONS');
  resolve(cross[0], 'usr_aicte', 'Lateral transfer confirmed with both institutions. Earlier seat released on 14 days notice.', 6);
  const esc = (f: FlagRow, d: number) => { f.status = 'ESCALATED'; log(instUser(f.institutionId), 'FLAG_ESCALATE', 'Flag', f.id, { status: 'OPEN' }, { status: 'ESCALATED', ruleCode: f.ruleCode }, daysAgo(d)); };
  esc(cross[1], 5); esc(ofRule('INTAKE_EXCEEDED')[0], 3);
  ofRule('APAAR_FORMAT_INVALID').filter((f) => ['inst_sabarmati', 'inst_kaveri'].includes(f.institutionId)).slice(0, 2).forEach((f, k) => {
    const r = byId.get(f.recordId!)!; r.status = 'REJECTED';
    f.status = 'RESOLVED'; f.resolvedAt = daysAgo(8 - k); f.resolvedById = instUser(f.institutionId); f.resolutionNote = 'Record rejected. APAAR ID could not be corrected from student documents.';
    log(instUser(f.institutionId), 'RECORD_REJECT', 'StudentRecord', r.id, { status: 'FLAGGED' }, { status: 'REJECTED', apaarId: r.apaarId }, f.resolvedAt);
  });

  // 6. version history: 6 corrected APAAR IDs, 18 corrected name typos, 4 later status changes
  const versions: { id: string; recordId: string; version: number; changedById: string; changedAt: Date; diffJson: string }[] = [];
  const addV = (r: Rec, version: number, at: Date, diff: object) => versions.push({ id: `ver_${String(versions.length + 1).padStart(4, '0')}`, recordId: r.id, version, changedById: instUser(r.institutionId), changedAt: at, diffJson: JSON.stringify(diff) });
  const clampT = (t: number) => new Date(Math.min(t, NOW.getTime() - 3600000));
  const unflagged = () => take((r) => r.status === 'VERIFIED' && reg(r) && flags.every((f) => f.recordId !== r.id));
  const nameTypo = (n: string) => { const i = 1 + Math.floor(rnd() * (n.length - 3)); return n.slice(0, i) + n[i + 1] + n[i] + n.slice(i + 2); };
  for (let k = 0; k < 24; k++) {
    const r = unflagged();
    addV(r, 1, r.createdAt, { record: { from: null, to: `created via ${r.batchId}` } });
    const at2 = clampT(r.createdAt.getTime() + rint(1, 4) * 86400000);
    if (k < 6) {
      addV(r, 2, at2, { apaarId: { from: r.apaarId!.slice(0, 11), to: r.apaarId } });
      if (k < 4) { addV(r, 3, clampT(at2.getTime() + 86400000), { status: { from: 'PENDING', to: 'VERIFIED' } }); r.updatedAt = clampT(at2.getTime() + 86400000); } else r.updatedAt = at2;
    } else { addV(r, 2, at2, { fullName: { from: nameTypo(r.fullName), to: r.fullName } }); r.updatedAt = at2; }
  }
  // records that have no version rows still get a v1 so every drawer has a timeline
  const hasV = new Set(versions.map((v) => v.recordId));
  for (const r of recs) if (!hasV.has(r.id)) addV(r, 1, r.createdAt, { record: { from: null, to: `created via ${r.batchId}` } });

  // PENDING: newest 3 clean rows per institution in the latest batch
  INSTS.forEach((i) => recs.filter((r) => r.institutionId === i.id && r.admissionYear === Y2 && r.status === 'VERIFIED' && flags.every((f) => f.recordId !== r.id) && !versions.some((v) => v.recordId === r.id && v.version > 1)).slice(-3).forEach((r) => (r.status = 'PENDING')));

  // 7. upload batches (+10 audit rows)
  const batches = INSTS.flatMap((i) => YEARS.map((y) => {
    const rs = recs.filter((r) => r.institutionId === i.id && r.admissionYear === y);
    const at = y === Y1 ? daysAgo(330 + INSTS.indexOf(i) * 3) : daysAgo(5 + INSTS.indexOf(i) * 4);
    const rejected = rs.filter((r) => r.status === 'REJECTED').length;
    const b = { id: `bat_${i.slug}_${y.slice(0, 4)}`, institutionId: i.id, admissionYear: y, uploadedById: `usr_inst_${i.slug}`, fileName: `${i.slug}_admissions_${y}.csv`, rowCount: rs.length, acceptedCount: rs.length - rejected, rejectedCount: rejected, flaggedCount: rs.filter((r) => flags.some((f) => f.recordId === r.id && f.severity !== 'INFO')).length, status: 'COMMITTED', createdAt: at };
    log(b.uploadedById, 'UPLOAD_COMMIT', 'UploadBatch', b.id, null, { fileName: b.fileName, rows: b.rowCount, flagged: b.flaggedCount }, at);
    return b;
  }));

  // 8. consents + verification audit rows
  const eligible = INSTS.map((i) => recs.find((r) => r.institutionId === i.id && r.status === 'VERIFIED' && r.apaarId && !hasMultiVersion(r.id))).filter(Boolean) as Rec[];
  function hasMultiVersion(id: string) { return versions.some((v) => v.recordId === id && v.version > 1); }
  const consents = [[eligible[0], 'usr_ver_hr', 'employment', 3], [eligible[1], 'usr_ver_hr', 'employment', 2], [eligible[2], 'usr_ver_reg', 'regulatory', 1]].map(([r, vu, purpose, d], k) => {
    const rec = r as Rec; const at = daysAgo(d as number);
    const c = { id: `con_${k + 1}`, token: createHash('sha256').update(`seed-token-${k}`).digest('hex').slice(0, 24), apaarId: rec.apaarId!, verifierUserId: vu as string, purpose: purpose as string, reason: purpose === 'employment' ? 'Pre-joining education verification' : 'Statutory inspection sample check', grantedAt: at, expiresAt: new Date(at.getTime() + 30 * 86400000), recordId: rec.id };
    log(c.verifierUserId, 'VERIFY_RECORD', 'Consent', c.id, null, { apaarId: `${c.apaarId.slice(0, 4)}****${c.apaarId.slice(-4)}`, purpose: c.purpose, consent: true }, at);
    return c;
  });
  audit.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  audit.forEach((a, i) => (a.id = `aud_${String(i + 1).padStart(4, '0')}`));

  // 9. risk scores
  const risk = computeRiskScores(INSTS.map((i, ii) => {
    const rs = recs.filter((r) => r.institutionId === i.id);
    const rf = (r: Rec) => flags.filter((f) => f.recordId === r.id && f.status !== 'RESOLVED');
    return { id: i.id, state: i.state, type: i.type, approvedTotal: yearStats[ii][0].approved, enrolledByYear: Object.fromEntries(yearStats[ii].map((s) => [s.year, s.enrolled])), totalRecords: rs.length,
      flaggedRecords: rs.filter((r) => rf(r).some((f) => f.severity !== 'INFO')).length, invalidApaarRecords: rs.filter((r) => rf(r).some((f) => f.ruleCode === 'APAAR_FORMAT_INVALID' || f.ruleCode === 'APAAR_MISSING')).length };
  }));

  return {
    users, institutions: INSTS.map((i) => ({ id: i.id, name: i.name, aicteId: i.aicteId, type: i.type, state: i.state, city: i.city, approvedIntakeTotal: i.courses.reduce((s, c) => s + c.intake, 0) })),
    courses: INSTS.flatMap((i) => i.courses.map((c, ci) => ({ id: courseId(i, ci), institutionId: i.id, name: c.name, level: c.level, approvedIntake: c.intake, supernumerarySeats: c.ss, declaredCategorySeats: JSON.stringify(declaredFor(c)) }))),
    batches, records: recs, versions, flags, consents, audit, risk, yearStats,
  };
}
