import InstitutionDetail from '@/components/overview/InstitutionDetail';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: { year?: string } }) {
  const u = await requirePage('/institutions');
  return <InstitutionDetail id={params.id} role={u.role} year={searchParams.year} base={`/institutions/${params.id}`} />;
}
