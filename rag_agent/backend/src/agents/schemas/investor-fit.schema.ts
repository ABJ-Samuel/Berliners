import { z } from 'zod';

/** Agent 4 — Investor / Founder Fit (doc §12.6). */
export const investorMatchSchema = z.object({
  profile_name: z.string(),
  match_score: z.number().min(0).max(100),
  match_reason: z.string(),
  concerns: z.array(z.string()),
});

export const founderMatchSchema = z.object({
  profile_name: z.string(),
  match_score: z.number().min(0).max(100),
  match_reason: z.string(),
});

export const investorFitSchema = z.object({
  best_investor_matches: z.array(investorMatchSchema),
  best_founder_matches: z.array(founderMatchSchema),
  recommended_team: z.array(z.string()),
  concerns: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export type InvestorFit = z.infer<typeof investorFitSchema>;
