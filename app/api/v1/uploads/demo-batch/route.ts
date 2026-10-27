import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildDemoBatchCsv } from '@/lib/upload/demo';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = await requireApi(['INSTITUTION_ADMIN']);
  if ('error' in g) return g.error;
  const u = new URL(req.url);
  const course = await prisma.course.findFirst({ where: { id: u.searchParams.get('courseId') ?? '', institutionId: g.user.institutionId! } });
  if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
  const csv = buildDemoBatchCsv(g.user.institutionId!, course.level as 'UG' | 'PG', u.searchParams.get('year') ?? '2026-27');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv' } });
}
