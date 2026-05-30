'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { landingPath } from '@/lib/routing';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? landingPath(user) : '/login');
  }, [user, loading, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">
      Loading…
    </div>
  );
}
