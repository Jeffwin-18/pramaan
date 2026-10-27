import { NextResponse } from 'next/server';
import { requireApi, scopeInstitution } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const g = await requireApi(['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const scope = scopeInstitution(g.user);
  const rec = await prisma.studentRecord.findFirst({ where: { id: params.id, ...(scope ? { institutionId: scope } : {}) }, select: { id: true } });
  if (!rec) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
  const v: any[] = await prisma.recordVersion.findMany({ where: { recordId: params.id }, orderBy: { version: 'desc' }, include: { changedBy: { select: { name: true, email: true } } } });
  return NextResponse.json({ versions: v.map((x) => ({ version: x.version, changedAt: x.changedAt, changedBy: x.changedBy, diff: JSON.parse(x.diffJson) })) });
}
