import VerifyPortal from '@/components/verify/VerifyPortal';
import { requirePage } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { maskApaar } from '@/lib/verify';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const u = await requirePage('/verify');
  const rows: any[] = await prisma.consent.findMany({ where: { verifierUserId: u.id }, orderBy: { grantedAt: 'desc' }, take: 8 });
  return <VerifyPortal who={u.email} recent={rows.map((c) => ({ id: c.id, apaar: maskApaar(c.apaarId), purpose: c.purpose, at: c.grantedAt.toISOString(), token: c.token, holder: null }))} />;
}
