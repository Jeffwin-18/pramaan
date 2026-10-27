'use client';
import { useEffect, useState } from 'react';

const KEYS: [string, string][] = [
  ['/', 'Focus search on the current list page'],
  ['Esc', 'Close the open drawer, dialog or this sheet'],
  ['?', 'Show or hide this sheet'],
  ['g then o', 'Go to Overview'],
  ['g then f', 'Go to Flag queue'],
  ['g then r', 'Go to Student records'],
];
const GO: Record<string, string> = { o: '/overview', f: '/flags', r: '/records' };

export function Hotkeys() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
      if (e.key === 'Escape') { setOpen(false); (t as HTMLElement).blur?.(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { const el = document.querySelector<HTMLInputElement>('[data-search]'); if (el) { e.preventDefault(); el.focus(); el.select(); } return; }
      if (e.key === '?') { setOpen((o) => !o); return; }
      if (e.key === 'g') { pendingG = Date.now(); return; }
      if (pendingG && Date.now() - pendingG < 1200 && GO[e.key]) { pendingG = 0; window.location.href = GO[e.key]; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <button aria-label="Keyboard shortcuts" onClick={() => setOpen((o) => !o)} className="fixed bottom-3 right-3 z-40 h-6 w-6 rounded border border-line bg-surface font-mono text-xs text-muted hover:text-ink">?</button>
      {open && (
        <div role="dialog" aria-label="Keyboard shortcuts" className="fixed bottom-12 right-3 z-50 w-80 rounded border border-line bg-surface">
          <div className="px-3 py-2 border-b border-line text-xs font-semibold uppercase tracking-wide text-muted">Keyboard shortcuts</div>
          <ul>{KEYS.map(([k, d]) => (
            <li key={k} className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-line last:border-0">
              <span className="text-sm">{d}</span><span className="kbd whitespace-nowrap">{k}</span>
            </li>))}</ul>
        </div>
      )}
    </>
  );
}
