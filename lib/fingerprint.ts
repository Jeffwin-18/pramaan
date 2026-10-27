// Duplicate-detection fingerprint. Aadhaar is never stored or accepted.
// fingerprint = SHA256(salt + normName + dob + normGuardian + gender). Only the hash is persisted.
import { createHash } from 'crypto';

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'kum', 'kumari', 'sri', 'shri', 'smt', 'dr']);

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter((t) => t && !HONORIFICS.has(t))
    .join(' ');
}

export function dobKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeFingerprint(p: { fullName: string; dob: Date; guardianName: string; gender: string }): string {
  const salt = process.env.FINGERPRINT_SALT ?? 'dev-salt';
  const payload = salt + normalizeName(p.fullName) + dobKey(p.dob) + normalizeName(p.guardianName) + p.gender.toUpperCase();
  return createHash('sha256').update(payload).digest('hex');
}
