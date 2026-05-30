'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Settings, LogOut } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { landingPath } from '@/lib/routing';
import type { Role } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  matches?: string[];
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  researcher: [
    { href: '/upload', label: 'My Documents' },
    { href: '/profile', label: 'Profile' },
  ],
  company: [
    { href: '/recommend', label: 'Find Papers' },
    { href: '/profile', label: 'Profile' },
  ],
};

export default function AppShell({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: Role;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Client-side route guard.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Enforce role on role-specific pages (but let users finish onboarding).
    if (requireRole && user.onboarded && user.type !== requireRole) {
      router.replace(landingPath(user));
    }
  }, [user, loading, requireRole, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">
        Loading…
      </div>
    );
  }

  const nav = NAV_BY_ROLE[user.type];
  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href={landingPath(user)} className="text-lg font-bold tracking-tight">
              ScholarLab
            </Link>
            <nav className="flex items-center gap-6">
              {nav.map((item) => {
                const matchers = item.matches ?? [item.href];
                const active = matchers.some((m) => pathname?.startsWith(m));
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      active
                        ? 'text-ink underline underline-offset-[6px] decoration-2'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-border bg-canvas px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline">
              {user.type}
            </span>
            <button className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink">
              <Bell size={16} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink">
              <Settings size={16} />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-border bg-black/5"
                aria-label="account"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-muted">
                    {displayName[0]?.toUpperCase() ?? '·'}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-white shadow-card">
                  <div className="border-b border-border px-3 py-2">
                    <div className="truncate text-sm font-medium text-ink">{displayName}</div>
                    <div className="truncate text-xs text-muted">{user.email}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      router.replace('/login');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-muted">
        © 2024 ScholarLab Research Systems. All rights reserved.
      </footer>
    </div>
  );
}
