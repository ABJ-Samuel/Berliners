'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { landingPath } from '@/lib/routing';
import { setTokens } from '@/lib/tokens';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The backend redirects here with tokens in the URL fragment:
    //   /auth/callback#accessToken=...&refreshToken=...&tokenType=Bearer&expiresIn=3600
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      setError('Login failed: no tokens received.');
      return;
    }

    setTokens({ accessToken, refreshToken });
    // Remove tokens from the URL so they don't linger in history.
    window.history.replaceState(null, '', '/auth/callback');

    void refreshUser().then((user) => {
      router.replace(user ? landingPath(user) : '/login');
    });
  }, [refreshUser, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      {error ? (
        <div>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="mt-4 text-sm text-ink underline underline-offset-4"
          >
            Back to login
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">Signing you in…</p>
      )}
    </div>
  );
}
