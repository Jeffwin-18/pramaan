import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { landingFor } from '@/lib/roles';
import LoginClient from './LoginClient';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  const u = await getCurrentUser();
  if (u) redirect(landingFor(u.role));
  return <LoginClient demo={process.env.DEMO_LOGIN === 'true'} />;
}
