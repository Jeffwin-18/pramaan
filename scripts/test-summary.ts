import { writeFileSync } from 'fs';
import { renderSummary } from '../lib/pdf/summary';
renderSummary({ generatedAt: '24 Oct 2026, 14:41 IST', year: '2025-26', scope: 'National view', kpi: { reporting: 5, institutions: 5, records: 418, verifiedPct: 86.1, openBlockers: 22, overIntake: 1 },
  states: [{ state: 'Gujarat', institutions: 2, records: 145, verifiedPct: 84.1, openFlags: 20, overIntake: 0 }, { state: 'Tamil Nadu', institutions: 2, records: 182, verifiedPct: 85.2, openFlags: 17, overIntake: 1 }],
  risk: [{ name: 'Sabarmati Institute of Technology, Ahmedabad', state: 'Gujarat', score: 57, why: 'Repeated 100% intake: 2 of 2 years at 100%; flagged records: 13.8% of records.' }], rules: [{ rule: 'APAAR_FORMAT_INVALID', count: 10 }, { rule: 'DUPLICATE_WITHIN_INSTITUTION', count: 6 }] })
  .then((b) => { writeFileSync('/tmp/summary.pdf', b); console.log('ok', b.length); });
