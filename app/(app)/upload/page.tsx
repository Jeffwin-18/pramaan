import { requirePage } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { YEARS } from '@/lib/upload/db';
import UploadWizard from '@/components/upload/UploadWizard';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const u = await requirePage('/upload');
  const [inst, courses, batches] = await Promise.all([
    prisma.institution.findUnique({ where: { id: u.institutionId! } }),
    prisma.course.findMany({ where: { institutionId: u.institutionId! }, orderBy: { id: 'asc' } }),
    prisma.uploadBatch.findMany({ where: { institutionId: u.institutionId! }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  return (
    <UploadWizard
      institution={inst!.name}
      years={YEARS}
      courses={courses.map((c: any) => ({ id: c.id, name: c.name, level: c.level, intake: c.approvedIntake, ss: c.supernumerarySeats }))}
      batches={batches.map((b: any) => ({ id: b.id, fileName: b.fileName, year: b.admissionYear, rows: b.rowCount, accepted: b.acceptedCount, rejected: b.rejectedCount, flagged: b.flaggedCount, at: b.createdAt.toISOString() }))}
    />
  );
}
