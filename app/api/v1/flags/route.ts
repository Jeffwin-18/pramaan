import { NextResponse } from 'next/server';
import { requireApi, scopeInstitution } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
const RANK: Record<string, number> = { BLOCKER: 0, WARNING: 1, INFO: 2 };

export async function GET(req: Request) {
  const g = await requireApi(['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const p = new URL(req.url).searchParams;
  const status = p.get('status') ?? 'OPEN', page = Math.max(1, +(p.get('page') ?? 1)), pageSize = 50;
  const q = (p.get('q') ?? '').trim();
  const where: Record<string, unknown> = {};
  const scope = scopeInstitution(g.user);
  if (scope) where.institutionId = scope; else if (p.get('institution')) where.institutionId = p.get('institution');
  if (p.get('rule')) where.ruleCode = p.get('rule');
  if (p.get('severity')) where.severity = p.get('severity');
  if (p.get('batch')) where.record = { is: { uploadBatchId: p.get('batch') } };
  if (q) where.OR = [{ message: { contains: q } }, { ruleCode: { contains: q.toUpperCase() } }, { record: { is: { OR: [{ fullName: { contains: q } }, { apaarId: { contains: q } }] } } }];

  const [tabRows, matched, lastBatch] = await Promise.all([
    prisma.flag.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.flag.findMany({ where: status === 'ALL' ? where : { ...where, status }, orderBy: { createdAt: 'desc' }, take: 1000, include: { record: { include: { course: { select: { name: true } } } }, institution: { select: { id: true, name: true } } } }),
    prisma.uploadBatch.findFirst({ where: scope ? { institutionId: scope } : {}, orderBy: { createdAt: 'desc' } }),
  ]);
  const tabs: Record<string, number> = { OPEN: 0, ESCALATED: 0, RESOLVED: 0, ALL: 0 };
  for (const t of tabRows as { status: string; _count: { _all: number } }[]) { tabs[t.status] = t._count._all; tabs.ALL += t._count._all; }

  const sorted = (matched as any[]).sort((a, b) => RANK[a.severity] - RANK[b.severity] || +b.createdAt - +a.createdAt);
  const slice = sorted.slice((page - 1) * pageSize, page * pageSize);
  const relIds = slice.map((f) => f.relatedRecordId).filter(Boolean) as string[];
  const userIds = slice.map((f) => f.resolvedById).filter(Boolean) as string[];
  const [rel, users] = await Promise.all([
    relIds.length ? prisma.studentRecord.findMany({ where: { id: { in: relIds } }, include: { institution: { select: { name: true } } } }) : [],
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
  ]);
  const relMap = new Map((rel as any[]).map((r) => [r.id, r])), userMap = new Map((users as any[]).map((u) => [u.id, u.name]));

  return NextResponse.json({
    total: sorted.length, page, pageSize, tabs, lastScan: lastBatch?.createdAt ?? null,
    rows: slice.map((f) => ({
      id: f.id, ruleCode: f.ruleCode, severity: f.severity, message: f.message, explanation: f.explanation, suggestedFix: f.suggestedFix, confidence: f.confidence,
      status: f.status, createdAt: f.createdAt, resolvedAt: f.resolvedAt, resolutionNote: f.resolutionNote, resolvedBy: f.resolvedById ? userMap.get(f.resolvedById) ?? null : null,
      institution: f.institution,
      record: f.record && { id: f.record.id, apaarId: f.record.apaarId, fullName: f.record.fullName, dob: f.record.dob, gender: f.record.gender, category: f.record.category, admissionYear: f.record.admissionYear, admissionType: f.record.admissionType, status: f.record.status, courseName: f.record.course.name },
      related: f.relatedRecordId && relMap.get(f.relatedRecordId) ? (({ r }) => ({ id: r.id, fullName: r.fullName, apaarId: r.apaarId, admissionYear: r.admissionYear, institutionName: r.institution.name }))({ r: relMap.get(f.relatedRecordId) }) : null,
    })),
  });
}
