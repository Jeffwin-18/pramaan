import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { prisma } from './db';
import { canView, landingFor, type Role } from './roles';
import { readSessionCookie } from './session';

export interface CurrentUser { id: string; email: string; name: string; role: Role; organisation: string | null; institutionId: string | null }

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = readSessionCookie();
  if (!s) return null;
  const u = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!u || u.role !== s.role) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role as Role, organisation: u.organisation, institutionId: u.institutionId };
}

// Server components / pages: redirects instead of returning.
export async function requirePage(path: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (!canView(u.role, path)) redirect(landingFor(u.role));
  return u;
}

// Route handlers: enforce roles on the server, independent of what the UI shows.
export async function requireApi(roles: Role[]): Promise<{ user: CurrentUser } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) };
  if (!roles.includes(user.role)) return { error: NextResponse.json({ error: 'Role not permitted for this action' }, { status: 403 }) };
  return { user };
}

// Institution admins are confined to their own institution on every query.
export const scopeInstitution = (u: CurrentUser) => (u.role === 'INSTITUTION_ADMIN' ? u.institutionId : null);
