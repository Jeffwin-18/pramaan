import AuditTable from '@/components/audit/AuditTable';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Page() { await requirePage('/audit'); return <AuditTable />; }
