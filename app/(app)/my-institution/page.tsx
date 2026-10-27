import InstitutionDetail from '@/components/overview/InstitutionDetail';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: { year?: string } }) {
  const u = await requirePage('/my-institution');
  return <InstitutionDetail id={u.institutionId!} role={u.role} year={searchParams.year} base="/my-institution" />;
}
