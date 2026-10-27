import { requirePage } from '@/lib/auth';
import { coverageRows, flagReportRows, overIntakeRows } from '@/lib/reports';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const u = await requirePage('/reports');
  const [cov, over, fl] = await Promise.all([coverageRows(u), overIntakeRows(u), flagReportRows(u)]);
  const items = [
    { name: 'State-wise coverage', desc: 'One row per institution: approved intake, enrolment, fill %, record status counts, open flags, risk score.', file: 'coverage.csv', rows: cov.length, unit: 'institutions' },
    { name: 'Over-intake report', desc: 'Course-year and institution-year rows where enrolment exceeds approved intake plus supernumerary seats.', file: 'over-intake.csv', rows: over.length, unit: 'rows' },
    { name: 'Flagged records report', desc: 'Every flag with rule, severity, status and dates. APAAR IDs are masked and student names are excluded.', file: 'flags.csv', rows: fl.length, unit: 'flags' },
    { name: 'Summary report', desc: 'Two-page PDF: KPIs, state coverage, institution risk ranking and open flags by rule.', file: 'summary.pdf', rows: null, unit: '' },
  ];
  return (
    <div className="max-w-[1000px]">
      <h1 className="text-lg font-semibold">Reports</h1>
      <p className="text-sm text-muted mt-1">{u.role === 'INSTITUTION_ADMIN' ? 'Limited to your institution.' : 'National scope.'} Each export is written to the audit log.</p>
      <div className="mt-4 border border-line bg-surface rounded">
        <table className="w-full text-sm"><thead><tr><th className="th">Report</th><th className="th">Contents</th><th className="th text-right">Rows now</th><th className="th text-right">Download</th></tr></thead>
          <tbody>{items.map((r) => (
            <tr key={r.file} className="hover:bg-paper"><td className="td font-medium whitespace-nowrap">{r.name}<div className="font-mono text-xs text-muted font-normal">{r.file}</div></td><td className="td text-muted">{r.desc}</td>
              <td className="td num">{r.rows ?? ''}</td><td className="td text-right"><a className="btn btn-primary" href={`/api/v1/reports/${r.file}`}>{r.file.endsWith('pdf') ? 'Download PDF' : 'Download CSV'}</a></td></tr>))}</tbody></table>
      </div>
      <p className="mt-3 text-xs text-muted">Exports contain no Aadhaar numbers, no fingerprints and no student names.</p>
    </div>
  );
}
