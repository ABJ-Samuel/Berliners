import { NextResponse } from 'next/server';
import type { Paper } from '@/lib/types';

// TODO: replace with real backend (S3 upload + DB row)
export async function POST(request: Request) {
  const body = (await request.json()) as {
    title: string;
    authors: string;
    completedAt?: string;
    abstract: string;
    fields: string[];
    fileName?: string;
  };

  await new Promise((r) => setTimeout(r, 400));

  const paper: Paper = {
    id: `p_${Math.random().toString(36).slice(2, 8)}`,
    title: body.title || 'Untitled manuscript',
    authors: body.authors
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    abstract: body.abstract,
    fields: body.fields,
    completedAt: body.completedAt,
  };

  return NextResponse.json({ ok: true, paper });
}
