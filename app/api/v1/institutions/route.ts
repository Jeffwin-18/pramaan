import { NextResponse } from 'next/server';
import { requireApi, scopeInstitution } from '@/lib/auth';
import { getInstitutionStats } from '@/lib/stats';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const g = await requireApi(['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const p = new URL(req.url).searchParams;
  return NextResponse.json(await getInstitutionStats({ year: p.get('year') ?? undefined, state: p.get('state') ?? undefined, type: p.get('type') ?? undefined, institutionId: scopeInstitution(g.user) }));
}
