import { NextResponse } from 'next/server';
import { requireApi, scopeInstitution } from '@/lib/auth';
import { getInstitutionDetail, getInstitutionStats } from '@/lib/stats';
export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const g = await requireApi(['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const scope = scopeInstitution(g.user);
  if (scope && scope !== params.id) return NextResponse.json({ error: 'Institution not found.' }, { status: 404 });
  const d = await getInstitutionDetail(params.id);
  if (!d) return NextResponse.json({ error: 'Institution not found.' }, { status: 404 });
  const { stats } = await getInstitutionStats({ institutionId: params.id });
  return NextResponse.json({ institution: { id: d.inst.id, name: d.inst.name, aicteId: d.inst.aicteId, type: d.inst.type, state: d.inst.state, city: d.inst.city }, courses: d.inst.courses, stats: stats[0], openFlags: d.flags.length });
}
