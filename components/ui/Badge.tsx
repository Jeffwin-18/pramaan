const TONES = {
  ok: 'text-ok border-ok/40 bg-ok/10', warn: 'text-warn border-warn/40 bg-warn/10', bad: 'text-bad border-bad/40 bg-bad/10',
  neutral: 'text-muted border-line bg-paper', accent: 'text-accent border-accent/40 bg-accent/10', saffron: 'text-saffron border-saffron/40 bg-saffron/10',
};
export type Tone = keyof typeof TONES;
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge ${TONES[tone]}`}>{children}</span>;
}
// Shown anywhere ABC / DigiLocker or the APAAR checksum result appears.
export function MockBadge() {
  return <span className="badge text-saffron border-saffron/50 bg-saffron/10" title="Simulated result. No live ABC / DigiLocker call is made.">Mock</span>;
}
export const STATUS_TONE: Record<string, Tone> = { VERIFIED: 'ok', FLAGGED: 'bad', PENDING: 'warn', REJECTED: 'neutral' };
export const SEVERITY_TONE: Record<string, Tone> = { BLOCKER: 'bad', WARNING: 'warn', INFO: 'neutral' };
