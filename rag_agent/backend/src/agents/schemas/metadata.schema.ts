import { z } from 'zod';

/** Doc §6.8 — basic research metadata extracted during the ingestion job. */
export const metadataSchema = z.object({
  title: z.string().describe('The paper title, verbatim if present.'),
  abstract: z
    .string()
    .describe('The abstract, or a faithful 2-3 sentence summary if none is labelled.'),
  technical_summary: z
    .string()
    .describe('A precise technical summary for an expert reader.'),
  plain_english_summary: z
    .string()
    .describe('A plain-English summary a non-expert can understand.'),
  domains: z.array(z.string()).describe('Research domains, e.g. "AI", "Energy".'),
  methods: z.array(z.string()).describe('Key methods/techniques used.'),
  possible_applications: z
    .array(z.string())
    .describe('Concrete applications implied or stated.'),
  detected_industries: z
    .array(z.string())
    .describe('Industries that could plausibly use this.'),
  commercial_signals: z
    .array(z.string())
    .describe('Signals of commercial relevance found in the paper (e.g. "prototype mentioned").'),
  uncertainties: z
    .array(z.string())
    .describe('Things that are unclear or not stated in the paper.'),
});

export type Metadata = z.infer<typeof metadataSchema>;
