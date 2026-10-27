'use client';
import Papa from 'papaparse';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { Badge, MockBadge, SEVERITY_TONE, type Tone } from '@/components/ui/Badge';
import { FIELDS, applyMapping, autoMap, type FieldKey, type Mapping } from '@/lib/upload/parse';

interface Course { id: string; name: string; level: string; intake: number; ss: number }
interface Batch { id: string; fileName: string; year: string; rows: number; accepted: number; rejected: number; flagged: number; at: string }
interface Flag { ruleCode: string; severity: string; message: string; explanation: string; suggestedFix: string; confidence: number | null }
interface Row { row: number; status: 'PASS' | 'REVIEW' | 'FAIL'; errors: string[]; flags: Flag[]; apaarCheck: { formatOk: boolean; checksumOk: boolean | null } | null; display: { apaarId: string; fullName: string; dob: string; category: string; admissionType: string } }
interface Summary { total: number; pass: number; review: number; fail: number; unparseable: number; flagged: number; byRule: Record<string, number> }
interface Commit { batchId: string; accepted: number; rejected: number; flagged: number; flagsRaised: number; verified: number }

const STATUS_TONE: Record<string, Tone> = { PASS: 'ok', REVIEW: 'warn', FAIL: 'bad' };
const IST = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST';

export default function UploadWizard({ institution, courses, years, batches }: { institution: string; courses: Course[]; years: string[]; batches: Batch[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [year, setYear] = useState(years[years.length - 1]);
  const [fileName, setFileName] = useState('');
  const [paste, setPaste] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [results, setResults] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'FAIL' | 'REVIEW' | 'PASS'>('ALL');
  const [open, setOpen] = useState<number | null>(null);
  const [commit, setCommit] = useState<Commit | null>(null);
  const course = courses.find((c) => c.id === courseId);

  const mapped = useMemo(() => (mapping ? applyMapping(raw, mapping) : []), [raw, mapping]);
  const missingRequired = mapping ? FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.label) : [];

  function load(text: string, name: string) {
    const p = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    if (!p.meta.fields?.length || !p.data.length) { setError('No rows found. The first line must be a header row.'); return; }
    setError(null); setFileName(name); setHeaders(p.meta.fields); setRaw(p.data); setMapping(autoMap(p.meta.fields)); setResults(null); setSummary(null); setPaste(text);
  }
  async function onFile(f?: File) { if (f) load(await f.text(), f.name); }
  async function loadDemo() {
    setError(null);
    const r = await fetch(`/api/v1/uploads/demo-batch?courseId=${courseId}&year=${year}`);
    if (!r.ok) return setError('Could not load the demo batch. Retry.');
    load(await r.text(), 'demo_batch.csv');
  }

  async function validate() {
    setLoading(true); setError(null); setResults(null); setStep(2); setOpen(null);
    try {
      const r = await fetch('/api/v1/uploads/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId, admissionYear: year, rows: mapped }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setResults(j.results); setSummary(j.summary);
    } catch (e) { setError(`Could not validate the batch. ${(e as Error).message ?? ''} Retry.`.replace('  ', ' ')); }
    setLoading(false);
  }
  async function doCommit() {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/v1/uploads/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId, admissionYear: year, fileName, rows: mapped }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setCommit(j); setStep(3);
    } catch (e) { setError(`Could not commit the batch. ${(e as Error).message ?? ''} Retry.`); }
    setLoading(false);
  }
  function errorReport() {
    const rows = (results ?? []).filter((r) => r.status === 'FAIL').flatMap((r) => (r.errors.length ? r.errors.map((e) => ({ row: r.row, apaar_id: r.display.apaarId, name: r.display.fullName, rule: 'FIELD_INVALID', severity: 'BLOCKER', explanation: e })) : r.flags.filter((f) => f.severity === 'BLOCKER').map((f) => ({ row: r.row, apaar_id: r.display.apaarId, name: r.display.fullName, rule: f.ruleCode, severity: f.severity, explanation: f.explanation }))));
    const url = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'validation_errors.csv' }).click();
    URL.revokeObjectURL(url);
  }
  function reset() { setStep(1); setCommit(null); setResults(null); setSummary(null); setRaw([]); setHeaders([]); setMapping(null); setPaste(''); setFileName(''); setError(null); }

  const shown = (results ?? []).filter((r) => filter === 'ALL' || r.status === filter);

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold">Upload data</h1>
        <span className="text-muted">{institution}</span>
      </div>
      <ol className="mt-3 flex border border-line bg-surface rounded text-sm">
        {['Select course and file', 'Map columns and validate', 'Commit and summary'].map((s, i) => (
          <li key={s} className={`flex-1 px-3 py-2 ${i ? 'border-l border-line' : ''} ${step === i + 1 ? 'bg-paper font-semibold text-accent' : step > i + 1 ? 'text-ok' : 'text-muted'}`}>
            <span className="font-mono text-xs mr-2">{i + 1}</span>{s}
          </li>))}
      </ol>

      {error && <p role="alert" className="mt-3 text-bad border border-bad/40 bg-bad/5 rounded px-3 py-2">{error}</p>}

      {step === 1 && (
        <>
          <section className="mt-4 border border-line bg-surface rounded p-4 grid grid-cols-[280px_140px_1fr] gap-4 items-start">
            <label className="flex flex-col gap-1 text-sm font-medium">Course
              <select className="h-8 px-2 border border-line rounded bg-paper font-normal" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {course && <span className="font-normal text-xs text-muted">Approved intake <span className="font-mono">{course.intake}</span>, supernumerary <span className="font-mono">{course.ss}</span></span>}
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">Admission year
              <select className="h-8 px-2 border border-line rounded bg-paper font-normal font-mono" value={year} onChange={(e) => setYear(e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select>
            </label>
            <div className="flex flex-wrap gap-2 justify-end">
              <a className="btn" href="/api/v1/uploads/sample.csv">Download sample CSV</a>
              <button className="btn" onClick={loadDemo}>Load demo batch</button>
            </div>
          </section>

          <section className="mt-3 border border-line bg-surface rounded p-4">
            <div className="flex items-center gap-3">
              <label className="btn cursor-pointer">Choose CSV file<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} /></label>
              <span className="text-muted text-sm">{fileName ? <>Loaded <span className="font-mono">{fileName}</span>, {raw.length} rows, {headers.length} columns</> : 'or paste rows below. First line is the header.'}</span>
            </div>
            <textarea className="mt-3 w-full h-32 p-2 border border-line rounded bg-paper font-mono text-xs" placeholder="apaar_id,full_name,dob,gender,category,father_or_guardian_name" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <div className="mt-2 flex items-center gap-3">
              <button className="btn" disabled={!paste.trim()} onClick={() => load(paste, fileName || 'pasted_rows.csv')}>Parse pasted rows</button>
              <span className="flex-1" />
              <button className="btn btn-primary" disabled={!mapping || !course} onClick={() => setStep(2)} title={mapping ? undefined : 'Load a file or paste rows first'}>Next: map columns</button>
            </div>
            <p className="mt-3 text-xs text-muted">The father or guardian name is used only to compute a one-way duplicate fingerprint. It is not stored. Aadhaar numbers are not accepted.</p>
          </section>

          <h2 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent submissions</h2>
          <div className="border border-line bg-surface rounded overflow-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="th">Submitted</th><th className="th">File</th><th className="th">Year</th><th className="th text-right">Rows</th><th className="th text-right">Accepted</th><th className="th text-right">Rejected</th><th className="th text-right">Flagged</th></tr></thead>
              <tbody>
                {batches.length === 0 && <tr><td className="td text-muted" colSpan={7}>No submissions yet. Choose a course and upload a batch.</td></tr>}
                {batches.map((b) => (<tr key={b.id} className="hover:bg-paper"><td className="td whitespace-nowrap">{IST(b.at)}</td><td className="td font-mono text-xs">{b.fileName}</td><td className="td font-mono">{b.year}</td><td className="td num">{b.rows}</td><td className="td num">{b.accepted}</td><td className="td num">{b.rejected}</td><td className="td num">{b.flagged}</td></tr>))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {step === 2 && mapping && (
        <>
          <section className="mt-4 border border-line bg-surface rounded">
            <div className="px-4 py-2 border-b border-line flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Column mapping</span>
              <span className="text-sm text-muted">{course?.name}, {year}, {raw.length} rows from <span className="font-mono">{fileName}</span></span>
            </div>
            <div className="p-3 grid grid-cols-5 gap-x-4 gap-y-2">
              {FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1 text-xs font-medium">
                  <span>{f.label}{f.required && <span className="text-bad"> *</span>}</span>
                  <select className={`h-7 px-1 border rounded bg-paper font-normal font-mono text-xs ${f.required && !mapping[f.key] ? 'border-bad' : 'border-line'}`} value={mapping[f.key]} onChange={(e) => { setMapping({ ...mapping, [f.key as FieldKey]: e.target.value }); setResults(null); setSummary(null); }}>
                    <option value="">{f.required ? 'Not mapped' : 'Not provided'}</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>))}
            </div>
            <div className="px-4 py-2 border-t border-line flex items-center gap-3">
              <button className="btn" onClick={() => setStep(1)}>Back</button>
              <span className="text-sm text-muted flex-1">{missingRequired.length ? `Map required columns: ${missingRequired.join(', ')}` : 'All required columns mapped.'}</span>
              <button className="btn btn-primary" disabled={loading || missingRequired.length > 0} onClick={validate}>{results ? 'Re-run validation' : 'Run validation'}</button>
            </div>
          </section>

          <section className="mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mr-2">Validation preview</h2>
              <span className="text-xs text-muted">Nothing is written until you commit.</span>
              <MockBadge /><span className="text-xs text-muted">APAAR checksum</span>
            </div>
            {summary && (
              <div className="mt-2 grid grid-cols-4 border border-line bg-surface rounded divide-x divide-line">
                {([['ALL', 'Rows', summary.total, 'text-ink'], ['PASS', 'Pass', summary.pass, 'text-ok'], ['REVIEW', 'Review', summary.review, 'text-warn'], ['FAIL', 'Fail', summary.fail, 'text-bad']] as const).map(([k, l, n, c]) => (
                  <button key={k} onClick={() => setFilter(k)} className={`px-3 py-2 text-left hover:bg-paper ${filter === k ? 'bg-paper' : ''}`}>
                    <div className="text-xs uppercase tracking-wide text-muted">{l}</div><div className={`font-mono text-xl ${c}`}>{n}</div>
                  </button>))}
              </div>)}
            {summary && summary.fail > 0 && <p className="mt-2 text-sm">Validation failed on {summary.fail} row{summary.fail > 1 ? 's' : ''}. <button className="underline text-accent" onClick={errorReport}>Download the error report.</button></p>}

            <div className="mt-2 border border-line bg-surface rounded overflow-auto max-h-[56vh]">
              <table className="w-full text-sm">
                <thead><tr><th className="th w-10 text-right">#</th><th className="th w-[190px]">APAAR ID</th><th className="th">Name</th><th className="th">DOB</th><th className="th">Cat</th><th className="th">Result</th><th className="th">Rules and explanation</th></tr></thead>
                <tbody>
                  {loading && Array.from({ length: 7 }).map((_, i) => (<tr key={i}>{[40, 160, 150, 80, 40, 60, 320].map((w, j) => <td key={j} className="td"><div className="h-3 rounded-sm bg-line animate-pulse" style={{ width: w }} /></td>)}</tr>))}
                  {!loading && !results && !error && <tr><td colSpan={7} className="td text-muted">No validation run yet. Run validation to see per-row results.</td></tr>}
                  {!loading && results && shown.length === 0 && <tr><td colSpan={7} className="td text-muted">No rows match this filter.</td></tr>}
                  {!loading && shown.map((r) => (
                    <Fragment key={r.row}>
                      <tr className="hover:bg-paper cursor-pointer" onClick={() => setOpen(open === r.row ? null : r.row)}>
                        <td className="td num text-muted">{r.row}</td>
                        <td className="td"><div className="font-mono text-xs">{r.display.apaarId || <span className="text-muted">(blank)</span>}</div>
                          {r.apaarCheck && <div className="text-[10px] text-muted">Format {r.apaarCheck.formatOk ? <span className="text-ok">✓</span> : <span className="text-bad">✗</span>} · Checksum (mock) {r.apaarCheck.checksumOk === null ? <span>n/a</span> : r.apaarCheck.checksumOk ? <span className="text-ok">✓</span> : <span className="text-bad">✗</span>}</div>}</td>
                        <td className="td">{r.display.fullName}</td>
                        <td className="td font-mono text-xs">{r.display.dob}</td>
                        <td className="td font-mono text-xs">{r.display.category}</td>
                        <td className="td"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                        <td className="td">{r.errors.length === 0 && r.flags.length === 0 ? <span className="text-muted">No rules triggered</span> : (
                          <div className="flex flex-wrap gap-1">{r.errors.length > 0 && <Badge tone="bad">FIELD_INVALID</Badge>}{r.flags.map((f, i) => <Badge key={i} tone={SEVERITY_TONE[f.severity] as Tone}>{f.ruleCode}{f.confidence != null && f.ruleCode.startsWith('NAME') ? ` ${f.confidence.toFixed(2)}` : ''}</Badge>)}</div>)}</td>
                      </tr>
                      {open === r.row && (
                        <tr><td colSpan={7} className="px-3 py-3 bg-paper border-b border-line">
                          {r.errors.map((e, i) => <p key={i} className="text-sm"><span className="font-semibold text-bad">Field error.</span> {e}.</p>)}
                          {r.flags.map((f, i) => (<div key={i} className="mb-2 last:mb-0"><div className="flex items-center gap-2"><Badge tone={SEVERITY_TONE[f.severity] as Tone}>{f.severity}</Badge><span className="font-mono text-xs">{f.ruleCode}</span>{f.confidence != null && <span className="text-xs text-muted">confidence {f.confidence.toFixed(2)}</span>}</div>
                            <p className="mt-1 text-sm">{f.explanation}</p><p className="text-sm text-muted">Suggested fix: {f.suggestedFix}</p></div>))}
                        </td></tr>)}
                    </Fragment>))}
                </tbody>
              </table>
            </div>

            {results && summary && (
              <div className="mt-3 flex items-center gap-3 border border-line bg-surface rounded px-4 py-3">
                <p className="text-sm flex-1">
                  Committing stores {summary.total - summary.unparseable} row{summary.total - summary.unparseable === 1 ? '' : 's'}.{' '}
                  {summary.flagged > 0 && <>{summary.flagged} will be stored as FLAGGED and queued for review. </>}
                  {summary.unparseable > 0 && <>{summary.unparseable} unreadable row{summary.unparseable > 1 ? 's' : ''} will be rejected. </>}
                  Flagged rows are never auto-rejected.
                </p>
                <button className="btn btn-primary" disabled={loading || summary.total === summary.unparseable} onClick={doCommit}>{loading ? 'Committing' : 'Commit batch'}</button>
              </div>)}
          </section>
        </>
      )}

      {step === 3 && commit && (
        <section className="mt-4 border border-line bg-surface rounded">
          <div className="px-4 py-2 border-b border-line flex items-center gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-muted">Batch committed</span><span className="font-mono text-xs text-muted">{commit.batchId}</span></div>
          <div className="grid grid-cols-4 divide-x divide-line">
            {([['Accepted', commit.accepted, 'text-ok'], ['Rejected', commit.rejected, commit.rejected ? 'text-bad' : 'text-ink'], ['Flagged', commit.flagged, commit.flagged ? 'text-warn' : 'text-ink'], ['Verified (mock)', commit.verified, 'text-ink']] as const).map(([l, n, c]) => (
              <div key={l} className="px-4 py-3"><div className="text-xs uppercase tracking-wide text-muted">{l}</div><div className={`font-mono text-2xl ${c}`}>{n}</div></div>))}
          </div>
          <div className="px-4 py-3 border-t border-line flex items-center gap-3">
            <p className="text-sm flex-1">{commit.flagsRaised} flag{commit.flagsRaised === 1 ? '' : 's'} raised. Open the queue to resolve, escalate or reject.</p>
            <Link className="btn btn-primary" href={`/flags?batch=${commit.batchId}`}>View flags from this batch</Link>
            <Link className="btn" href={`/records?batch=${commit.batchId}`}>View records</Link>
            <button className="btn" onClick={reset}>New upload</button>
          </div>
        </section>
      )}
    </div>
  );
}
