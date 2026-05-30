import { z } from 'zod';

/** Agent 2 — Commercial Readiness (doc §10). Breakdown components sum to 100. */
export const commercialReadinessSchema = z.object({
  score: z.number().min(0).max(100),
  band: z.string(),
  score_breakdown: z.object({
    technical_maturity: z.number().min(0).max(25),
    application_clarity: z.number().min(0).max(20),
    customer_clarity: z.number().min(0).max(15),
    evidence_strength: z.number().min(0).max(15),
    implementation_feasibility: z.number().min(0).max(10),
    market_urgency: z.number().min(0).max(10),
    research_to_product_gap: z.number().min(0).max(5),
  }),
  positive_signals: z.array(z.string()),
  negative_signals: z.array(z.string()),
  missing_information: z.array(z.string()),
  // Accepted as a string from the model, then overwritten with the canonical
  // IP_NOTE constant in the agent so the §10.4 disclaimer can never drift.
  ip_note: z.string(),
  confidence: z.number().min(0).max(100),
});

export type CommercialReadiness = z.infer<typeof commercialReadinessSchema>;
