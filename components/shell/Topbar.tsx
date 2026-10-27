'use client';
import { useState } from 'react';
import { ROLE_LABEL, type Role } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';

export function Topbar({ name, email, role, scope }: { name: string; email: string; role: Role; scope: string }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  return (
    <header className="h-11 shrink-0 border-b border-line bg-surface flex items-center gap-3 px-4">
      <span className="text-sm text-muted truncate">{scope}</span>
      <div className="ml-auto flex items-center gap-3">
        <Badge tone={role === 'AUDITOR' ? 'neutral' : 'accent'}>{ROLE_LABEL[role]}</Badge>
        {role === 'AUDITOR' && <Badge tone="neutral">Read only</Badge>}
        <div className="text-right leading-tight">
          <div className="text-sm font-medium">{name}</div>
          <div className="font-mono text-[11px] text-muted">{email}</div>
        </div>
        <button className="btn" onClick={signOut} disabled={busy}>{busy ? 'Signing out' : 'Sign out'}</button>
      </div>
    </header>
  );
}
