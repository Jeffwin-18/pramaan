import { redirect } from 'next/navigation';
import { Hotkeys } from '@/components/shell/Hotkeys';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  let scope = user.organisation ?? '';
  if (user.role === 'AICTE_ADMIN' || user.role === 'AUDITOR') scope = `National view. ${await prisma.institution.count()} institutions reporting`;
  return (
    <div className="h-screen flex">
      <Sidebar role={user.role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar name={user.name} email={user.email} role={user.role} scope={scope} />
        <main className="flex-1 overflow-auto p-5">{children}</main>
      </div>
      <Hotkeys />
    </div>
  );
}
