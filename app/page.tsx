import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { landingFor } from '@/lib/roles';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const u = await getCurrentUser();
  redirect(u ? landingFor(u.role) : '/login');
}
