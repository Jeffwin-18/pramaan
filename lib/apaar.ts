// APAAR ID checks.
// Format rule (12 digits, first digit 1-9) follows the problem statement.
// The checksum is a MOCK (Verhoeff). The real APAAR checksum spec is not public.
// UI must render this as: "Format ✓ · Checksum (mock) ✓" and never as official verification.

const D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0],
];
const P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];
const INV = [0,4,3,2,1,5,6,7,8,9];

export function verhoeffCheckDigit(payload: string): number {
  let c = 0;
  const rev = payload.split('').reverse().map(Number);
  for (let i = 0; i < rev.length; i++) c = D[c][P[(i + 1) % 8][rev[i]]];
  return INV[c];
}

export function verhoeffValid(full: string): boolean {
  let c = 0;
  const rev = full.split('').reverse().map(Number);
  for (let i = 0; i < rev.length; i++) c = D[c][P[i % 8][rev[i]]];
  return c === 0;
}

export interface ApaarCheck {
  formatOk: boolean;
  checksumOk: boolean | null; // null when format failed so checksum was not evaluated
  reasons: string[];
}

export function validateApaar(raw: string): ApaarCheck {
  const id = raw.trim();
  const reasons: string[] = [];
  if (!/^\d+$/.test(id)) reasons.push('contains non-digit characters');
  else if (id.length !== 12) reasons.push(`has ${id.length} digits, expected 12`);
  if (/^\d/.test(id) && id[0] === '0') reasons.push('first digit must be 1-9');
  if (reasons.length) return { formatOk: false, checksumOk: null, reasons };
  const checksumOk = verhoeffValid(id);
  if (!checksumOk) reasons.push('checksum (mock) does not match');
  return { formatOk: true, checksumOk, reasons };
}

export function generateApaar(rand: () => number): string {
  const first = 1 + Math.floor(rand() * 9);
  let body = String(first);
  for (let i = 0; i < 10; i++) body += Math.floor(rand() * 10);
  return body + verhoeffCheckDigit(body);
}
