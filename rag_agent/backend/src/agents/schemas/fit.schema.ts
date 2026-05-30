import { z } from 'zod';

/** On-demand fit result for POST /assets/:id/fit (doc §4.2, §12.5 rubric). */
export const fitSchema = z.object({
  match_score: z.number().min(0).max(100),
  breakdown: z.object({
    domain_fit: z.number().min(0).max(25),
    stage_fit: z.number().min(0).max(15),
    business_model_fit: z.number().min(0).max(15),
    technical_risk_fit: z.number().min(0).max(15),
    customer_access_fit: z.number().min(0).max(10),
    founder_skill_fit: z.number().min(0).max(10),
    risk_tolerance_fit: z.number().min(0).max(10),
  }),
  match_reason: z.string(),
  concerns: z.array(z.string()),
  recommended_next_steps: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export type FitResult = z.infer<typeof fitSchema>;
