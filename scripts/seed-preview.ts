// Runs the seed builder without touching the database. Used to inspect counts and rule coverage.
import { buildSeedData } from '../prisma/seed-data';
import { RULES } from '../lib/rules';

const d = buildSeedData();
const by = <T,>(a: T[], k: (x: T) => string) => a.reduce<Record<string, number>>((m, x) => ((m[k(x)] = (m[k(x)] ?? 0) + 1), m), {});
console.log('TABLE COUNTS');
console.table({ User: d.users.length, Institution: d.institutions.length, Course: d.courses.length, UploadBatch: d.batches.length, StudentRecord: d.records.length, RecordVersion: d.versions.length, Flag: d.flags.length, Consent: d.consents.length, AuditLog: d.audit.length, RiskScore: d.risk.length });
console.log('\nRECORD STATUS', by(d.records, (r) => r.status));
console.log('RECORDS BY YEAR', by(d.records, (r) => r.admissionYear));
console.log('\nRULE FIRINGS (record-level, all statuses)');
const fired = by(d.flags.filter((f) => f.recordId), (f) => f.ruleCode);
console.table(RULES.map((r) => ({ rule: r.code, fired: fired[r.code] ?? 0 })));
console.log('institution-level flags:', by(d.flags.filter((f) => !f.recordId), (f) => f.ruleCode));
console.log('\nFLAG STATUS', by(d.flags, (f) => f.status), ' SEVERITY', by(d.flags, (f) => f.severity));
console.log('\nNEAR-MATCH CONFIDENCES', d.flags.filter((f) => f.ruleCode === 'NAME_NEAR_MATCH_EXISTING').map((f) => f.confidence).sort());
console.log('\nPER INSTITUTION');
console.table(d.institutions.map((i, k) => ({ institution: i.name, intake: i.approvedIntakeTotal, '2024-25': d.yearStats[k][0].enrolled, '2025-26': d.yearStats[k][1].enrolled, fill25: ((d.yearStats[k][1].enrolled / i.approvedIntakeTotal) * 100).toFixed(1) + '%', records: d.records.filter((r) => r.institutionId === i.id).length })));
console.log('RISK SCORES');
const nm = new Map(d.institutions.map((i) => [i.id, i.name]));
console.table([...d.risk].sort((a, b) => b.score - a.score).map((r) => ({ institution: nm.get(r.institutionId), score: r.score, ...Object.fromEntries(r.factors.map((f) => [f.key, f.points])) })));
for (const r of [...d.risk].sort((a, b) => b.score - a.score)) console.log(`  ${r.score}  ${nm.get(r.institutionId)}: ${r.explanation}`);
console.log('\nSAMPLE EXPLANATIONS');
for (const code of ['DUPLICATE_ACROSS_INSTITUTIONS', 'NAME_NEAR_MATCH_EXISTING', 'INTAKE_EXCEEDED', 'CATEGORY_MISMATCH']) console.log(`  [${code}] ${d.flags.find((f) => f.ruleCode === code && f.recordId)!.explanation}`);
console.log('\nAUDIT ACTIONS', by(d.audit, (a) => a.action));

console.log('\nSEEDED CONSENT RECORDS (verifiable APAAR IDs for the demo)');
console.table(d.consents.map((c) => { const r = d.records.find((x) => x.id === c.recordId)!; return { apaarId: c.apaarId, name: r.fullName, institution: nm.get(r.institutionId)?.split(',')[0], year: r.admissionYear, purpose: c.purpose }; }));
const nearTarget = d.flags.find((f) => f.ruleCode === 'NAME_NEAR_MATCH_EXISTING' && f.status === 'OPEN')!;
const nr = d.records.find((x) => x.id === nearTarget.recordId)!;
console.log('Open near-match example:', nr.fullName, nr.apaarId, 'conf', nearTarget.confidence, '@', nm.get(nr.institutionId));
const kav = d.records.filter((x) => x.institutionId === 'inst_kaveri' && x.status === 'VERIFIED' && x.apaarId && d.versions.filter((v) => v.recordId === x.id).length > 1)[0];
console.log('Record with multi-version history:', kav?.fullName, kav?.apaarId, '@', nm.get(kav?.institutionId));
