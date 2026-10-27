import React from 'react';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';

const h = React.createElement as any;
const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#16191D' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1F3A5F' }, sub: { color: '#5D636B', marginTop: 2, marginBottom: 12 },
  h2: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 4, textTransform: 'uppercase', color: '#5D636B' },
  kpis: { flexDirection: 'row', borderWidth: 1, borderColor: '#E3E1DC' }, kpi: { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: '#E3E1DC' },
  kl: { fontSize: 7, color: '#5D636B', textTransform: 'uppercase' }, kv: { fontSize: 14, fontFamily: 'Courier-Bold', marginTop: 2 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E3E1DC', paddingVertical: 3 }, th: { fontFamily: 'Helvetica-Bold', color: '#5D636B', fontSize: 8 },
  foot: { position: 'absolute', left: 36, right: 36, bottom: 24, fontSize: 7, color: '#5D636B' },
});
export interface SummaryInput {
  generatedAt: string; year: string; scope: string;
  kpi: { reporting: number; institutions: number; records: number; verifiedPct: number; openBlockers: number; overIntake: number };
  states: { state: string; institutions: number; records: number; verifiedPct: number; openFlags: number; overIntake: number }[];
  risk: { name: string; state: string; score: number | null; why: string | null }[];
  rules: { rule: string; count: number }[];
}
const cell = (t: string, w: number | string, extra: object = {}) => h(Text, { style: [{ width: w }, extra] }, t);
const row = (cells: [string, number | string, object?][], head = false, key?: string) => h(View, { style: s.tr, key }, ...cells.map(([t, w, e], i) => h(Text, { key: i, style: [{ width: w }, head ? s.th : {}, e ?? {}] }, t)));

export async function renderSummary(d: SummaryInput): Promise<Buffer> {
  const K = (l: string, v: string, i: number) => h(View, { style: s.kpi, key: i }, h(Text, { style: s.kl }, l), h(Text, { style: s.kv }, v));
  return renderToBuffer(h(Document, { title: 'APAAR platform summary' }, h(Page, { size: 'A4', style: s.page },
    h(Text, { style: s.title }, 'APAAR Verification Platform: summary report'),
    h(Text, { style: s.sub }, `${d.scope}. Reporting year ${d.year}. Generated ${d.generatedAt}. Prototype, synthetic data.`),
    h(View, { style: s.kpis }, K('Reporting', `${d.kpi.reporting}/${d.kpi.institutions}`, 0), K('Student records', String(d.kpi.records), 1), K('Verified', `${d.kpi.verifiedPct.toFixed(1)}%`, 2), K('Open blockers', String(d.kpi.openBlockers), 3), K('Over-intake', String(d.kpi.overIntake), 4)),
    h(Text, { style: s.h2 }, 'State-wise coverage'),
    row([['State', 120], ['Institutions', 70], ['Records', 60], ['Verified', 60], ['Open flags', 60], ['Over intake', 60]], true),
    ...d.states.map((r) => row([[r.state, 120], [String(r.institutions), 70], [String(r.records), 60], [`${r.verifiedPct.toFixed(1)}%`, 60], [String(r.openFlags), 60], [String(r.overIntake), 60]], false, r.state)),
    h(Text, { style: s.h2 }, 'Institution risk score'),
    row([['Institution', 190], ['Score', 40], ['Why', 280]], true),
    ...[...d.risk].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map((r) => row([[r.name, 190], [String(r.score ?? 'n/a'), 40, { fontFamily: 'Courier-Bold' }], [r.why ?? '', 280]], false, r.name)),
    h(Text, { style: s.h2 }, 'Open flags by rule'),
    ...d.rules.sort((a, b) => b.count - a.count).map((r) => row([[r.rule, 260], [String(r.count), 60, { fontFamily: 'Courier' }]], false, r.rule)),
    h(Text, { style: s.foot }, 'Risk score is advisory. It ranks institutions for review and is not a finding. Checksum and ABC / DigiLocker results in this system are simulated.'))));
}
