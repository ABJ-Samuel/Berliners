import type {
  ApiDocument,
  RecommendQuery,
  RecommendResponse,
  User,
} from './types';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokens';

// Base URL of the real backend API (Express, mounted at /v1).
// e.g. NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/v1
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Single in-flight refresh shared across concurrent 401s.
let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data);
    return true;
  } catch {
    return false;
  }
}

function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Authenticated fetch against the backend. Injects the Bearer token and, on a
// 401, transparently refreshes once and retries.
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let res = await fetch(`${BASE}${path}`, withAuth(getAccessToken()));
  if (res.status === 401) {
    const ok = await refreshTokens();
    if (ok) {
      res = await fetch(`${BASE}${path}`, withAuth(getAccessToken()));
    }
  }
  return res;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

// ---- Auth / User ----
export async function getMe(): Promise<User> {
  return json<User>(await authFetch('/users/me'));
}

export async function updateMe(patch: Partial<{
  firstName: string;
  lastName: string;
  description: string;
  type: 'researcher' | 'company';
  onboarded: boolean;
}>): Promise<User> {
  return json<User>(
    await authFetch('/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function logoutBackend(): Promise<void> {
  try {
    await authFetch('/auth/logout', { method: 'POST' });
  } catch {
    /* best effort */
  }
}

// ---- Documents (researcher) ----
export async function listDocuments(): Promise<ApiDocument[]> {
  const data = await json<{ documents: ApiDocument[] }>(await authFetch('/documents'));
  return data.documents;
}

export async function uploadDocument(input: {
  file: File;
  title?: string;
  description?: string;
}): Promise<ApiDocument> {
  const form = new FormData();
  form.append('file', input.file);
  if (input.title) form.append('title', input.title);
  if (input.description) form.append('description', input.description);
  // Do NOT set Content-Type: the browser adds the multipart boundary.
  return json<ApiDocument>(await authFetch('/documents', { method: 'POST', body: form }));
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await authFetch(`/documents/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new ApiError(res.status, `Delete failed (${res.status})`);
  }
}

export async function downloadDocument(doc: ApiDocument): Promise<void> {
  const res = await authFetch(`/documents/${doc.id}/download`);
  if (!res.ok) throw new ApiError(res.status, `Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Recommend (company) — still mocked via in-app route ----
export async function recommend(query: RecommendQuery): Promise<RecommendResponse> {
  const res = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new ApiError(res.status, `Recommend failed (${res.status})`);
  return res.json() as Promise<RecommendResponse>;
}
