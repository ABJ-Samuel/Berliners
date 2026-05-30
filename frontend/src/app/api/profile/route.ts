import { NextResponse } from 'next/server';
import { mockProfile } from '@/lib/mock-data';
import type { UserProfile } from '@/lib/types';

// TODO: replace with real backend (DB or external API)
let currentProfile: UserProfile = mockProfile;

export async function GET() {
  await new Promise((r) => setTimeout(r, 150));
  return NextResponse.json(currentProfile);
}

export async function PUT(request: Request) {
  const body = (await request.json()) as UserProfile;
  await new Promise((r) => setTimeout(r, 250));
  currentProfile = { ...currentProfile, ...body };
  return NextResponse.json({ ok: true, profile: currentProfile });
}
