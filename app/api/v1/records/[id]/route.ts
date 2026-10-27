import { NextResponse } from 'next/server';
import { requireApi, scopeInstitution } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const g = await requireApi(['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR']);
  if ('error' in g) return g.error;
  const scope = scopeInstitution(g.user);
  const r: any = await prisma.studentRecord.findFirst({ where: { id: params.id, ...(scope ? { institutionId: scope } : {}) }, include: { institution: { select: { id: true, name: true } }, course: { select: { name: true } }, flags: { orderBy: { createdAt: 'desc' } }, versions: { orderBy: { version: 'desc' }, include: { changedBy: { select: { name: true, email: true } } } } } });
  if (!r) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
  return NextResponse.json({
    record: { id: r.id, apaarId: r.apaarId, fullName: r.fullName, dob: r.dob, gender: r.gender, category: r.category, isNRI: r.isNRI, isOCI: r.isOCI, isForeignNational: r.isForeignNational, admissionYear: r.admissionYear, admissionType: r.admissionType, status: r.status, fingerprint: r.fingerprint, institution: r.institution, course: r.course.name, uploadBatchId: r.uploadBatchId, createdAt: r.createdAt, updatedAt: r.updatedAt },
    flags: r.flags.map((f: any) => ({ id: f.id, ruleCode: f.ruleCode, severity: f.severity, status: f.status, explanation: f.explanation, confidence: f.confidence })),
    versions: r.versions.map((v: any) => ({ version: v.version, changedAt: v.changedAt, changedBy: v.changedBy, diff: JSON.parse(v.diffJson) })),
  });
}
