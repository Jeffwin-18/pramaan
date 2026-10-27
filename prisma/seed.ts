// All institutions and students are fictional; data is synthetic for demo purposes.
// Writes the dataset built by seed-data.ts. Idempotent: clears all tables first.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildSeedData } from './seed-data';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@2026';

async function chunked<T>(rows: T[], fn: (c: T[]) => Promise<unknown>, size = 150) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function main() {
  const d = buildSeedData();
  for (const m of ['riskScore', 'auditLog', 'consent', 'flag', 'recordVersion', 'studentRecord', 'uploadBatch', 'user', 'course', 'institution'] as const)
    await (prisma[m] as any).deleteMany();

  await prisma.institution.createMany({ data: d.institutions });
  await prisma.course.createMany({ data: d.courses });
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.createMany({ data: d.users.map((u) => ({ ...u, passwordHash: hash })) });
  await prisma.uploadBatch.createMany({ data: d.batches });
  await chunked(d.records, (c) => prisma.studentRecord.createMany({
    data: c.map((r) => ({ id: r.id, institutionId: r.institutionId, courseId: r.courseId, uploadBatchId: r.batchId, apaarId: r.apaarId, fullName: r.fullName, dob: r.dob, gender: r.gender, category: r.category, isNRI: r.isNRI, isOCI: r.isOCI, isForeignNational: r.isForeignNational, admissionYear: r.admissionYear, admissionType: r.admissionType, status: r.status, fingerprint: r.fingerprint, createdAt: r.createdAt, updatedAt: r.updatedAt })),
  }));
  await chunked(d.versions, (c) => prisma.recordVersion.createMany({ data: c }));
  await prisma.flag.createMany({ data: d.flags.map((f) => ({ id: f.id, recordId: f.recordId, institutionId: f.institutionId, ruleCode: f.ruleCode, severity: f.severity, message: f.message, explanation: f.explanation, suggestedFix: f.suggestedFix, confidence: f.confidence, relatedRecordId: f.relatedRecordId ?? null, status: f.status, createdAt: f.createdAt, resolvedAt: f.resolvedAt, resolvedById: f.resolvedById, resolutionNote: f.resolutionNote })) });
  await prisma.consent.createMany({ data: d.consents });
  await prisma.auditLog.createMany({ data: d.audit });
  await prisma.riskScore.createMany({ data: d.risk.map((r) => ({ institutionId: r.institutionId, score: r.score, factorsJson: JSON.stringify(r.factors), explanation: r.explanation, computedAt: new Date() })) });

  const counts = {
    User: await prisma.user.count(), Institution: await prisma.institution.count(), Course: await prisma.course.count(),
    UploadBatch: await prisma.uploadBatch.count(), StudentRecord: await prisma.studentRecord.count(), RecordVersion: await prisma.recordVersion.count(),
    Flag: await prisma.flag.count(), Consent: await prisma.consent.count(), AuditLog: await prisma.auditLog.count(), RiskScore: await prisma.riskScore.count(),
  };
  console.log('Seeded:'); console.table(counts);
  console.log(`Demo password for all accounts: ${DEMO_PASSWORD}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
