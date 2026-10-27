// Signed-cookie session. Payload is HMAC-SHA256 signed; the user row is re-read on every request,
// so a deleted user or changed role takes effect immediately.
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { Role } from './roles';

export const COOKIE = 'apaar_session';
const TTL_MS = 8 * 3600 * 1000;
const secret = () => process.env.SESSION_SECRET ?? 'dev-secret';
const sign = (b: string) => createHmac('sha256', secret()).update(b).digest('base64url');

export interface SessionPayload { uid: string; role: Role; exp: number }

export function encodeSession(uid: string, role: Role): string {
  const body = Buffer.from(JSON.stringify({ uid, role, exp: Date.now() + TTL_MS } satisfies SessionPayload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

export const sessionCookieOptions = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: TTL_MS / 1000, secure: process.env.NODE_ENV === 'production' };
export const readSessionCookie = () => decodeSession(cookies().get(COOKIE)?.value);
