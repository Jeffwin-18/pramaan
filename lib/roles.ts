export type Role = 'AICTE_ADMIN' | 'INSTITUTION_ADMIN' | 'VERIFIER' | 'AUDITOR';
export const ROLE_LABEL: Record<Role, string> = { AICTE_ADMIN: 'AICTE Admin', INSTITUTION_ADMIN: 'Institution Admin', VERIFIER: 'Verifier', AUDITOR: 'Auditor' };

// Single source of truth for navigation and page-level access.
export interface NavItem { href: string; label: string; roles: Role[]; match?: string }
export const NAV: NavItem[] = [
  { href: '/overview', label: 'Overview', roles: ['AICTE_ADMIN', 'AUDITOR'] },
  { href: '/institutions', label: 'Institutions', roles: ['AICTE_ADMIN', 'AUDITOR'] },
  { href: '/my-institution', label: 'Institution', roles: ['INSTITUTION_ADMIN'] },
  { href: '/upload', label: 'Upload data', roles: ['INSTITUTION_ADMIN'] },
  { href: '/flags', label: 'Flag queue', roles: ['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR'] },
  { href: '/records', label: 'Student records', roles: ['AICTE_ADMIN', 'INSTITUTION_ADMIN', 'AUDITOR'] },
  { href: '/verify', label: 'Verification', roles: ['AICTE_ADMIN', 'VERIFIER'] },
  { href: '/reports', label: 'Reports', roles: ['AICTE_ADMIN', 'AUDITOR', 'INSTITUTION_ADMIN'] },
  { href: '/audit', label: 'Audit log', roles: ['AICTE_ADMIN', 'AUDITOR'] },
];
export function landingFor(role: Role): string {
  return role === 'VERIFIER' ? '/verify' : role === 'INSTITUTION_ADMIN' ? '/my-institution' : '/overview';
}
export function canView(role: Role, href: string): boolean {
  return NAV.some((n) => (href === n.href || href.startsWith(n.href + '/')) && n.roles.includes(role));
}
