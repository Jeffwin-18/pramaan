// Near-duplicate name matching: token-level Levenshtein + sorted-string Levenshtein.
// Output is a 0-1 score. Callers must route matches to human review, never auto-reject.

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function levRatio(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  return len === 0 ? 1 : 1 - levenshtein(a, b) / len;
}

// Inputs are expected to be already normalised (see normalizeName).
export function nameSimilarity(a: string, b: string): number {
  const ta = a.split(' ').filter(Boolean), tb = b.split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const [small, large] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const tokenScore = small.reduce((s, t) => s + Math.max(...large.map((u) => levRatio(t, u))), 0) / large.length;
  const sortedScore = levRatio([...ta].sort().join(' '), [...tb].sort().join(' '));
  return 0.5 * tokenScore + 0.5 * sortedScore;
}
