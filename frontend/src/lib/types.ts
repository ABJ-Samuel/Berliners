// ---- Backend domain models (mirror of the Express API at /v1) ----

export type Role = 'researcher' | 'company';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  description: string;
  type: Role;
  onboarded: boolean;
  oauthProvider: string;
  oauthProviderId: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocument {
  id: string;
  userId: string;
  title: string | null;
  description: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  url: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

// ---- Company-side matching (mocked in /api/recommend for now) ----

export type RecommendIndustry =
  | 'AI / Machine Learning'
  | 'FinTech'
  | 'Web3 / Blockchain'
  | 'Healthcare / Biotech'
  | 'Cybersecurity'
  | 'E-commerce / Retail'
  | 'Manufacturing / Industrial';

export interface RecommendQuery {
  company: string;
  description: string;
  industry?: RecommendIndustry;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  fields: string[];
  completedAt?: string;
}

export interface RecommendedPaper extends Paper {
  relevance: number; // 0..1
  snippet: string;
}

export interface RecommendResponse {
  query: RecommendQuery;
  results: RecommendedPaper[];
}
