export type Industry =
  | 'Biotechnology'
  | 'Clean Energy'
  | 'Quantum Computing'
  | 'Robotics'
  | 'AI/ML';

export interface UserProfile {
  fullName: string;
  primaryExpertise: string;
  industry: Industry;
  bio: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  fields: string[];
  completedAt?: string;
}

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

export interface RecommendedPaper extends Paper {
  relevance: number; // 0..1
  snippet: string;
}

export interface RecommendResponse {
  query: RecommendQuery;
  results: RecommendedPaper[];
}
