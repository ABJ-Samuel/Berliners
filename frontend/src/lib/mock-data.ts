import type { Paper, RecommendedPaper, UserProfile } from './types';

export const mockProfile: UserProfile = {
  fullName: 'Dr. Elena Volkova',
  primaryExpertise: 'Neural Network Compression',
  industry: 'Biotechnology',
  bio: '',
};

export const mockPapers: Paper[] = [
  {
    id: 'p_001',
    title: 'Efficient Transformer Pruning for Edge Inference',
    authors: ['Sarah Jenkins', 'Mark Vance'],
    abstract:
      'A structured pruning regime that reduces transformer FLOPs by 64% while preserving downstream accuracy across QA, classification, and summarization benchmarks.',
    fields: ['Quantum Computing', 'Deep Learning'],
    completedAt: '2025-09-10',
  },
];

const SAMPLE_RESULTS: RecommendedPaper[] = [
  {
    id: 'p_101',
    title: 'Cross-Chain Liquidity Routing under Adversarial MEV',
    authors: ['Y. Tanaka', 'R. Singh', 'P. Almeida'],
    abstract:
      'We propose a routing protocol that quantifies sandwich-attack risk per hop and reroutes liquidity using a verifiable delay function, reducing extracted value by 41% on Uniswap v4 traces.',
    fields: ['Web3', 'Game Theory'],
    relevance: 0.94,
    snippet:
      'Routing protocol that quantifies sandwich-attack risk per hop and reroutes liquidity using a VDF...',
  },
  {
    id: 'p_102',
    title: 'Real-Time Card Fraud Detection with Graph Neural Networks',
    authors: ['M. Okafor', 'L. Bianchi'],
    abstract:
      'A streaming GNN architecture trained on 2.4B transactions detects card-not-present fraud at 73% recall with sub-50ms latency, evaluated on payment processor production traffic.',
    fields: ['FinTech', 'Graph Learning'],
    relevance: 0.89,
    snippet:
      'Streaming GNN trained on 2.4B transactions detects card-not-present fraud at 73% recall...',
  },
  {
    id: 'p_103',
    title: 'PII-Preserving Embeddings for Regulated Payment Workloads',
    authors: ['A. Chen', 'D. Müller', 'F. Costa'],
    abstract:
      'A contrastive embedding scheme that maintains PCI-DSS compliance by training on tokenized representations, transferable across EU, US, and APAC jurisdictions.',
    fields: ['Privacy', 'Representation Learning'],
    relevance: 0.82,
    snippet:
      'Contrastive embeddings trained on tokenized representations, transferable across EU, US, APAC...',
  },
];

export function mockRecommend(query: {
  company: string;
  description: string;
}): RecommendedPaper[] {
  const seed = `${query.company} ${query.description}`.toLowerCase();
  // 為了讓 demo 有點變化：根據 query 長度切前 N 篇
  const n = Math.max(1, Math.min(3, Math.ceil(seed.length / 40)));
  return SAMPLE_RESULTS.slice(0, n).map((p) => ({
    ...p,
    relevance: Math.max(0.55, p.relevance - Math.random() * 0.05),
  }));
}
