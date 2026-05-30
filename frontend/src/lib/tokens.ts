// Client-side token store. The backend issues JWTs via the OAuth callback and
// the URL fragment; we keep them in localStorage so both the React auth context
// and the API client (module scope) can read/refresh them.
//
// Note: localStorage is XSS-exposed. Acceptable for this project; a hardened
// setup would use httpOnly cookies set by a server route.

import type { AuthTokens } from './types';

const ACCESS_KEY = 'pm_access_token';
const REFRESH_KEY = 'pm_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: Pick<AuthTokens, 'accessToken' | 'refreshToken'>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function hasTokens(): boolean {
  return Boolean(getAccessToken() && getRefreshToken());
}
