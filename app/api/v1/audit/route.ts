import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = await requireApi(['AICTE_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const p = new URL(req.url).searchParams, page = Math.max(1, +(p.get('page') ?? 1)), pageSize = 50, q = (p.get('q') ?? '').trim();
  const where: Record<string, unknown> = {};
  if (p.get('action')) where.action = p.get('action');
  if (p.get('role')) where.actorRole = p.get('role');
  if (p.get('actor')) where.actorUserId = p.get('actor');
  const from = p.get('from'), to = p.get('to');
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(`${from}T00:00:00+05:30`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999+05:30`) } : {}) };
  if (q) where.OR = [{ entityId: { contains: q } }, { action: { contains: q.toUpperCase() } }, { entityType: { contains: q } }, { afterJson: { contains: q } }];
  const [total, rows, actions, users] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.groupBy({ by: ['action'], _count: { _all: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);
  const um = new Map((users as any[]).map((u) => [u.id, u]));
  return NextResponse.json({ total, page, pageSize, actions: (actions as any[]).map((a) => a.action).sort(), actors: users,
    rows: (rows as any[]).map((a) => ({ id: a.id, at: a.createdAt, actor: a.actorUserId ? um.get(a.actorUserId) ?? { name: a.actorUserId, email: '' } : null, role: a.actorRole, action: a.action, entityType: a.entityType, entityId: a.entityId, before: a.beforeJson ? JSON.parse(a.beforeJson) : null, after: a.afterJson ? JSON.parse(a.afterJson) : null, ip: a.ip })) });
}
