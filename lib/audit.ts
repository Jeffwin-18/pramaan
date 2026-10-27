import { randomUUID } from 'crypto';
import { prisma } from './db';

export async function writeAudit(a: { actorUserId: string | null; actorRole: string; action: string; entityType: string; entityId: string; before?: unknown; after?: unknown; ip: string }) {
  return prisma.auditLog.create({ data: { id: `aud_${randomUUID().slice(0, 12)}`, actorUserId: a.actorUserId, actorRole: a.actorRole, action: a.action, entityType: a.entityType, entityId: a.entityId, beforeJson: a.before ? JSON.stringify(a.before) : null, afterJson: a.after ? JSON.stringify(a.after) : null, ip: a.ip } });
}
export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
