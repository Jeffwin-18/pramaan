// Flag actions. Single and bulk requests both go through here so permissions and audit are identical.
import { randomUUID } from 'crypto';
import { verifyWithAbc } from '../abc';
import { writeAudit } from '../audit';
import type { CurrentUser } from '../auth';
import { prisma } from '../db';

export type FlagAction = 'resolve' | 'escalate' | 'reject';
export type ActionResult = { ok: true; flagId: string; recordStatus?: string } | { ok: false; status: number; error: string };
const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
const fail = (status: number, error: string): ActionResult => ({ ok: false, status, error });

export async function applyFlagAction(user: CurrentUser, flagId: string, action: FlagAction, rawNote: string | undefined, ip: string): Promise<ActionResult> {
  const note = (rawNote ?? '').trim();
  if (user.role === 'AUDITOR' || user.role === 'VERIFIER') return fail(403, 'Your role is read-only for flags.');
  const flag = await prisma.flag.findUnique({ where: { id: flagId }, include: { record: true } });
  if (!flag || (user.role === 'INSTITUTION_ADMIN' && flag.institutionId !== user.institutionId)) return fail(404, 'Flag not found.');
  if (flag.status === 'RESOLVED') return fail(409, 'Flag is already resolved.');
  if (user.role === 'INSTITUTION_ADMIN' && flag.status === 'ESCALATED') return fail(403, 'Escalated to AICTE. Only AICTE can act on it now.');
  if ((action === 'resolve' || action === 'reject') && note.length < 3) return fail(400, 'A resolution note is required.');
  if (action === 'escalate' && flag.status === 'ESCALATED') return fail(409, 'Flag is already escalated.');
  if (action === 'reject' && !flag.recordId) return fail(400, 'Institution-level flags have no record to reject.');

  const now = new Date();
  const nextVersion = async (recordId: string) => ((await prisma.recordVersion.findFirst({ where: { recordId }, orderBy: { version: 'desc' } }))?.version ?? 0) + 1;
  const base = { actorUserId: user.id, actorRole: user.role, ip };

  if (action === 'escalate') {
    await prisma.flag.update({ where: { id: flag.id }, data: { status: 'ESCALATED', resolutionNote: note || null } });
    await writeAudit({ ...base, action: 'FLAG_ESCALATE', entityType: 'Flag', entityId: flag.id, before: { status: flag.status }, after: { status: 'ESCALATED', ruleCode: flag.ruleCode, note } });
    return { ok: true, flagId: flag.id };
  }

  if (action === 'resolve') {
    await prisma.flag.update({ where: { id: flag.id }, data: { status: 'RESOLVED', resolvedAt: now, resolvedById: user.id, resolutionNote: note } });
    let recordStatus: string | undefined;
    if (flag.record && flag.record.status === 'FLAGGED') {
      const stillOpen = await prisma.flag.count({ where: { recordId: flag.recordId, id: { not: flag.id }, status: { not: 'RESOLVED' }, severity: { not: 'INFO' } } });
      if (stillOpen === 0 && flag.record.apaarId && (await verifyWithAbc(flag.record.apaarId)).status === 'LINKED') { // MOCK
        recordStatus = 'VERIFIED';
        await prisma.$transaction([
          prisma.studentRecord.update({ where: { id: flag.record.id }, data: { status: 'VERIFIED' } }),
          prisma.recordVersion.create({ data: { id: uid('ver'), recordId: flag.record.id, version: await nextVersion(flag.record.id), changedById: user.id, changedAt: now, diffJson: JSON.stringify({ status: { from: 'FLAGGED', to: 'VERIFIED' } }) } }),
        ]);
      }
    }
    await writeAudit({ ...base, action: 'FLAG_RESOLVE', entityType: 'Flag', entityId: flag.id, before: { status: flag.status }, after: { status: 'RESOLVED', ruleCode: flag.ruleCode, note, recordStatus } });
    return { ok: true, flagId: flag.id, recordStatus };
  }

  // reject: the record is rejected and every open flag on it is closed with the same note
  const rec = flag.record!;
  await prisma.$transaction([
    prisma.flag.updateMany({ where: { recordId: rec.id, status: { not: 'RESOLVED' } }, data: { status: 'RESOLVED', resolvedAt: now, resolvedById: user.id, resolutionNote: `Record rejected. ${note}` } }),
    prisma.studentRecord.update({ where: { id: rec.id }, data: { status: 'REJECTED' } }),
    prisma.recordVersion.create({ data: { id: uid('ver'), recordId: rec.id, version: await nextVersion(rec.id), changedById: user.id, changedAt: now, diffJson: JSON.stringify({ status: { from: rec.status, to: 'REJECTED' } }) } }),
  ]);
  await writeAudit({ ...base, action: 'RECORD_REJECT', entityType: 'StudentRecord', entityId: rec.id, before: { status: rec.status }, after: { status: 'REJECTED', viaFlag: flag.id, ruleCode: flag.ruleCode, note } });
  return { ok: true, flagId: flag.id, recordStatus: 'REJECTED' };
}
