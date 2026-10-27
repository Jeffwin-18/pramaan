import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/audit';
import { requireApi } from '@/lib/auth';
import { refreshRiskScores } from '@/lib/risk-db';
import { applyFlagAction } from '@/lib/flags/actions';

export const dynamic = 'force-dynamic';

// Bulk resolve. Each flag is processed individually, so each gets its own permission check and audit row.
export async function POST(req: Request) {
  const g = await requireApi(['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const { ids, note } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length || ids.length > 200) return NextResponse.json({ error: 'Select between 1 and 200 flags.' }, { status: 400 });
  const ip = clientIp(req);
  let resolved = 0; const skipped: { id: string; reason: string }[] = [];
  for (const id of ids) {
    const r = await applyFlagAction(g.user, String(id), 'resolve', note, ip);
    if (r.ok) resolved++; else if (r.status === 403 && g.user.role === 'AUDITOR') return NextResponse.json({ error: r.error }, { status: 403 }); else skipped.push({ id: String(id), reason: r.error });
  }
  if (resolved) await refreshRiskScores().catch(() => {});
  return NextResponse.json({ resolved, skipped });
}
