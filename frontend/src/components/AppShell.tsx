'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Bell, Settings, LogOut } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  matches?: string[];
}

const NAV: NavItem[] = [
  { href: '/recommend', label: 'Dashboard' },
  { href: '/upload', label: 'Upload', matches: ['/upload', '/profile'] },
  { href: '#', label: 'Library' },
  { href: '#', label: 'Archive' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href="/recommend" className="text-lg font-bold tracking-tight">
              ScholarLab
            </Link>
            <nav className="flex items-center gap-6">
              {NAV.map((item) => {
                const matchers = item.matches ?? (item.href === '#' ? [] : [item.href]);
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
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-muted">
                    {session?.user?.name?.[0] ?? '·'}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-white shadow-card">
                  <div className="border-b border-border px-3 py-2 text-xs text-muted">
                    {session?.user?.email ?? 'guest'}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
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
