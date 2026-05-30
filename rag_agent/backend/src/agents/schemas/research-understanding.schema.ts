import { z } from 'zod';

/** Agent 1 — Research Understanding (doc §9.3). */
export const researchUnderstandingSchema = z.object({
  technical_summary: z.string(),
  plain_english_summary: z.string(),
  core_innovation: z.string(),
  research_domains: z.array(z.string()),
  methods_used: z.array(z.string()),
  possible_applications: z.array(z.string()),
  evidence_from_paper: z
    .array(z.string())
    .describe('Concrete evidence found in the paper (results, experiments).'),
  limitations: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export type ResearchUnderstanding = z.infer<typeof researchUnderstandingSchema>;
