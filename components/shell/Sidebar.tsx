'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, type Role } from '@/lib/roles';

export function Sidebar({ role }: { role: Role }) {
  const path = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));
  return (
    <nav aria-label="Primary" className="w-[200px] shrink-0 border-r border-line bg-surface flex flex-col">
      <div className="h-11 flex items-center px-4 border-b border-line">
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">APAAR Platform</div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-muted">AICTE data layer</div>
        </div>
      </div>
      <ul className="py-2 flex-1">
        {items.map((n) => {
          const active = path === n.href || path.startsWith(n.href + '/');
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={active ? 'page' : undefined}
                className={`flex items-center h-8 px-4 border-l-2 text-sm ${active ? 'border-accent bg-paper font-semibold text-accent' : 'border-transparent text-ink hover:bg-paper'}`}>
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="px-4 py-3 border-t border-line text-[11px] text-muted leading-snug">Prototype build. Synthetic data. Team Deep Thinkers, SIH26263.</div>
    </nav>
  );
}
