import { NextResponse } from 'next/server';
import { requireApi, scopeInstitution } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
const SORTS = ['fullName', 'apaarId', 'admissionYear', 'status', 'createdAt'];

export async function GET(req: Request) {
  const g = await requireApi(['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const p = new URL(req.url).searchParams;
  const page = Math.max(1, +(p.get('page') ?? 1)), pageSize = 50, q = (p.get('q') ?? '').trim();
  const where: Record<string, unknown> = {};
  const scope = scopeInstitution(g.user);
  if (scope) where.institutionId = scope; else if (p.get('institution')) where.institutionId = p.get('institution');
  for (const k of ['status', 'batch', 'year'] as const) if (p.get(k)) where[k === 'batch' ? 'uploadBatchId' : k === 'year' ? 'admissionYear' : 'status'] = p.get(k);
  if (q) where.OR = [{ fullName: { contains: q } }, { apaarId: { contains: q } }];
  const sort = SORTS.includes(p.get('sort') ?? '') ? p.get('sort')! : 'createdAt', dir = p.get('dir') === 'asc' ? 'asc' : 'desc';
  const [total, rows] = await Promise.all([
    prisma.studentRecord.count({ where }),
    prisma.studentRecord.findMany({ where, orderBy: [{ [sort]: dir }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize,
      include: { institution: { select: { name: true } }, course: { select: { name: true } }, _count: { select: { flags: { where: { status: { not: 'RESOLVED' } } } } } } }),
  ]);
  return NextResponse.json({ total, page, pageSize, rows: (rows as any[]).map((r) => ({ id: r.id, apaarId: r.apaarId, fullName: r.fullName, institution: r.institution.name, course: r.course.name, admissionYear: r.admissionYear, admissionType: r.admissionType, category: r.category, status: r.status, openFlags: r._count.flags })) });
}
