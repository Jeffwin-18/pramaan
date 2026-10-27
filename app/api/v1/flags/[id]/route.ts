import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/audit';
import { requireApi } from '@/lib/auth';
import { refreshRiskScores } from '@/lib/risk-db';
import { applyFlagAction } from '@/lib/flags/actions';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await requireApi(['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const { action, note } = await req.json().catch(() => ({}));
  if (!['resolve', 'escalate', 'reject'].includes(action)) return NextResponse.json({ error: 'action must be resolve, escalate or reject.' }, { status: 400 });
  const r = await applyFlagAction(g.user, params.id, action, note, clientIp(req));
  if (r.ok) await refreshRiskScores().catch(() => {});
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
}
