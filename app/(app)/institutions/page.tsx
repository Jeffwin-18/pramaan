import InstitutionsTable from '@/components/overview/InstitutionsTable';
import { requirePage } from '@/lib/auth';
import { getInstitutionStats } from '@/lib/stats';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requirePage('/institutions');
  const { stats, year } = await getInstitutionStats({});
  return <InstitutionsTable rows={stats} year={year} />;
}
