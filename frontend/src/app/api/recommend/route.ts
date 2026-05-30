import { NextResponse } from 'next/server';
import { mockRecommend } from '@/lib/mock-data';
import type { RecommendQuery, RecommendResponse } from '@/lib/types';

// TODO: replace with real recommender (vector search / RAG service)
export async function POST(request: Request) {
  const query = (await request.json()) as RecommendQuery;

  await new Promise((r) => setTimeout(r, 800));

  const response: RecommendResponse = {
    query,
    results: mockRecommend({ company: query.company, description: query.description }),
  };
  return NextResponse.json(response);
}
