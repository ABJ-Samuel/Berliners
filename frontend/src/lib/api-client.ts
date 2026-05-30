import type {
  Paper,
  RecommendQuery,
  RecommendResponse,
  UserProfile,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

// ---- Profile ----
export function getProfile() {
  return req<UserProfile>('/api/profile');
}
export function saveProfile(profile: UserProfile) {
  return req<{ ok: true; profile: UserProfile }>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// ---- Papers ----
export function submitPaper(payload: {
  title: string;
  authors: string;
  completedAt?: string;
  abstract: string;
  fields: string[];
  fileName?: string;
}) {
  return req<{ ok: true; paper: Paper }>('/api/papers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---- Recommend ----
export function recommend(query: RecommendQuery) {
  return req<RecommendResponse>('/api/recommend', {
    method: 'POST',
    body: JSON.stringify(query),
  });
}
