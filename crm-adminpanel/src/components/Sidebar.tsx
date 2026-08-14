'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Role } from '@/lib/rbac';
import { can } from '@/lib/rbac';
import { BRAND } from '@/lib/brand';

const NAV: { href: string; label: string; icon: JSX.Element; perm?: Parameters<typeof can>[1] }[] = [
  { href: '/', label: 'Dashboard', icon: <Icon d="M3 12h7V3H3v9Zm0 9h7v-7H3v7Zm11 0h7V12h-7v9Zm0-18v7h7V3h-7Z" /> },
  { href: '/leads', label: 'Leads', icon: <Icon d="M4 4h16v4H4V4Zm0 6h16v4H4v-4Zm0 6h10v4H4v-4Z" />, perm: 'lead.read' },
  { href: '/investors', label: 'Investors', icon: <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8 8 0 0 1-5.7-2.4c.6-2 3-3.1 5.7-3.1s5.1 1.1 5.7 3.1A8 8 0 0 1 12 20Z" />, perm: 'investor.read' },
  { href: '/admins', label: 'Team', icon: <Icon d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-6 1.3-6 4v3h8v-3c0-1.1.5-2.1 1.3-2.9A9.7 9.7 0 0 0 8 14Zm8 0c-3 0-6 1.5-6 4.2V21h12v-2.8c0-2.7-3-4.2-6-4.2Z" />, perm: 'admin.manage' },
  { href: '/audit', label: 'Audit', icon: <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z" />, perm: 'audit.read' },
  { href: '/settings', label: 'Settings', icon: <Icon d="m12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.9 4a7.6 7.6 0 0 0-.1-1.1l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.9-1.1L16 2H8l-.5 2.8a7.5 7.5 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0 0 2.2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.9 1.1L8 22h8l.5-2.8a7.5 7.5 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.6c.06-.36.1-.73.1-1.1Z" /> },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Sidebar({ admin }: { admin: { full_name: string | null; email: string; role: Role } }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const initials = (admin.full_name || admin.email)
    .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="panel w-[236px] shrink-0 p-4 flex flex-col h-[calc(100vh-2rem)] sticky top-4">
      {/* Brand */}
      <div className="px-1 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] font-extrabold"
            style={{ background: 'var(--gold-grad)', color: '#16130A' }}
          >
            {BRAND.monogram}
          </div>
          <div className="leading-tight">
            <div className="display text-[14.5px] tracking-tight">{BRAND.name}</div>
            <div className="eyebrow" style={{ fontSize: 9 }}>{BRAND.tagline}</div>
          </div>
        </div>
      </div>

      <div className="divider mb-3" />

      <nav className="flex-1 space-y-1">
        {NAV.filter((n) => !n.perm || can(admin.role, n.perm)).map((n) => {
          const active = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={`nav-item ${active ? 'nav-item-active' : ''}`}>
              <span className="opacity-90">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="divider my-3" />

      {/* Account */}
      <div className="flex items-center gap-2.5 px-1 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ border: '1px solid var(--border-str)', color: 'var(--gold-soft)', background: 'rgba(212,175,55,.08)' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold truncate">{admin.full_name || admin.email}</div>
          <div className="eyebrow" style={{ fontSize: 9 }}>{admin.role}</div>
        </div>
      </div>

      <button className="btn-ghost w-full" onClick={signOut}>Sign out</button>
    </aside>
  );
}
