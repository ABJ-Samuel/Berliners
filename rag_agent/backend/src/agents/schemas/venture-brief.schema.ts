import { z } from 'zod';

/** Agent 5 — Venture Brief (doc §13.2). Markdown is rendered in code from these. */
export const ventureBriefSchema = z.object({
  title: z.string(),
  one_liner: z.string(),
  research_summary: z.string(),
  commercial_opportunity: z.string(),
  target_customer: z.string(),
  problem: z.string(),
  solution: z.string(),
  business_model: z.string(),
  why_now: z.string(),
  risks: z.array(z.string()),
  validation_steps: z.array(z.string()),
  recommended_founder_team: z.string(),
  recommended_investor_type: z.string(),
  mvp_product_idea: z.string(),
  missing_information: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export type VentureBrief = z.infer<typeof ventureBriefSchema>;
