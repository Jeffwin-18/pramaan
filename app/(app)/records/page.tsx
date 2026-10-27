import RecordsTable from '@/components/records/RecordsTable';
import { requirePage, scopeInstitution } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { YEARS } from '@/lib/upload/db';

export const dynamic = 'force-dynamic';

export default async function RecordsPage({ searchParams: s }: { searchParams: Record<string, string | undefined> }) {
  const u = await requirePage('/records');
  const scope = scopeInstitution(u);
  const insts = await prisma.institution.findMany({ where: scope ? { id: scope } : {}, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  return <RecordsTable institutions={insts} years={YEARS} initial={{ batch: s.batch ?? '', status: s.status ?? '', institution: s.institution ?? '', year: s.year ?? '', q: s.q ?? '' }} />;
}
