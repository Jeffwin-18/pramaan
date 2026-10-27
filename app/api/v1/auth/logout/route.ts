import { NextResponse } from 'next/server';
import { clientIp, writeAudit } from '@/lib/audit';
import { COOKIE, readSessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  const s = readSessionCookie();
  if (s) await writeAudit({ actorUserId: s.uid, actorRole: s.role, action: 'LOGOUT', entityType: 'Session', entityId: s.uid, ip: clientIp(req) });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
