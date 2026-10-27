// Runs the demo batch through the validator against the seeded dataset (no DB).
import Papa from 'papaparse';
import { buildSeedData } from '../prisma/seed-data';
import { buildDemoBatchCsv, sampleCsv } from '../lib/upload/demo';
import { applyMapping, autoMap } from '../lib/upload/parse';
import { validateBatch } from '../lib/upload/validate';

const sd = buildSeedData();
const inst = sd.institutions.find((i) => i.id === 'inst_kaveri')!;
const course = sd.courses.find((c) => c.institutionId === inst.id && c.name.includes('Computer'))!;
const year = '2026-27';
for (const [label, csv] of [['DEMO BATCH', buildDemoBatchCsv(inst.id, 'UG', year)], ['SAMPLE CSV', sampleCsv()]] as const) {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const mapping = autoMap(parsed.meta.fields!);
  console.log(`\n=== ${label}: headers -> mapping`); console.log(mapping);
  const { results, summary } = validateBatch({
    rows: applyMapping(parsed.data, mapping), institutionId: inst.id, year,
    course: { id: course.id, name: course.name, approvedIntake: course.approvedIntake, supernumerarySeats: course.supernumerarySeats, declaredCategorySeats: JSON.parse(course.declaredCategorySeats) },
    existing: sd.records, institutions: new Map(sd.institutions.map((i) => [i.id, i])),
    initialCounts: { total: 0, supernumerary: 0, regularByCategory: {} },
  });
  console.log(summary);
  for (const r of results) console.log(String(r.row).padStart(2), r.status.padEnd(6), (r.display.apaarId || '(blank)').padEnd(13), r.display.fullName.padEnd(26), r.errors.concat(r.flags.map((f) => f.ruleCode + (f.confidence != null && f.ruleCode.startsWith('NAME') ? ` ${f.confidence}` : ''))).join(', '));
}
