import FlagQueue from '@/components/flags/FlagQueue';
import { requirePage, scopeInstitution } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RULES } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export default async function FlagsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const u = await requirePage('/flags');
  const scope = scopeInstitution(u);
  const insts = await prisma.institution.findMany({ where: scope ? { id: scope } : {}, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const rules = [...RULES.map((r) => ({ code: r.code, label: r.label })), { code: 'FULL_INTAKE_CONSECUTIVE_YEARS', label: 'Intake filled 100% in consecutive years' }];
  const s = searchParams;
  return <FlagQueue role={u.role} institutions={insts} rules={rules} initial={{ status: s.status ?? 'OPEN', rule: s.rule ?? '', severity: s.severity ?? '', institution: s.institution ?? '', batch: s.batch ?? '', q: s.q ?? '' }} />;
}
