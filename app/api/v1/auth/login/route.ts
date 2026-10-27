import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { clientIp, writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { landingFor, type Role } from '@/lib/roles';
import { COOKIE, encodeSession, sessionCookieOptions } from '@/lib/session';

// One-click demo accounts so judges never type passwords. Disabled when DEMO_LOGIN != "true".
const DEMO: Record<string, string> = {
  AICTE_ADMIN: 'aicte.admin@demo.aicte.example',
  INSTITUTION_ADMIN: 'inst.kaveri@demo.aicte.example',
  VERIFIER: 'hr.verifier@talentbridge.example',
  AUDITOR: 'auditor@demo.aicte.example',
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  let email: string | undefined, viaDemo = false;
  if (body.demo) {
    if (process.env.DEMO_LOGIN !== 'true' || !DEMO[body.demo]) return NextResponse.json({ error: 'Demo login unavailable' }, { status: 403 });
    email = DEMO[body.demo]; viaDemo = true;
  } else email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const ok = user && (viaDemo || (typeof body.password === 'string' && (await bcrypt.compare(body.password, user.passwordHash))));
  if (!user || !ok) {
    await writeAudit({ actorUserId: null, actorRole: 'ANONYMOUS', action: 'LOGIN_FAILED', entityType: 'Session', entityId: email ?? 'unknown', ip: clientIp(req) });
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }
  await writeAudit({ actorUserId: user.id, actorRole: user.role, action: 'LOGIN', entityType: 'Session', entityId: user.id, after: { demo: viaDemo }, ip: clientIp(req) });
  const res = NextResponse.json({ redirect: landingFor(user.role as Role) });
  res.cookies.set(COOKIE, encodeSession(user.id, user.role as Role), sessionCookieOptions);
  return res;
}
