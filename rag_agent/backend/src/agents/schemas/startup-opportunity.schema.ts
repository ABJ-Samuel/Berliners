import { z } from 'zod';

/** Agent 3 — Startup Opportunity (doc §11.3). One concrete opportunity. */
export const startupOpportunitySchema = z.object({
  title: z.string(),
  one_liner: z.string(),
  problem: z.string(),
  solution: z.string(),
  target_customer: z.string(),
  buyer_persona: z.string(),
  beachhead_market: z.string(),
  business_model: z.string(),
  why_now: z.string(),
  first_product: z.string(),
  required_team: z.array(z.string()),
  risks: z.array(z.string()),
  validation_steps: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export type StartupOpportunity = z.infer<typeof startupOpportunitySchema>;
