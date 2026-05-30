import { z } from 'zod';

// Proper string→boolean coercion: only 'true'/'1' are truthy (z.coerce.boolean
// treats any non-empty string as true, which mis-parses 'false').
const boolish = z.preprocess(
  (v) => (typeof v === 'string' ? v.toLowerCase() === 'true' || v === '1' : v),
  z.boolean(),
);

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1),

  GCP_PROJECT_ID: z.string().min(1),
  GCP_LOCATION: z.string().min(1).default('us-central1'),
  VERTEX_EMBEDDING_MODEL: z.string().min(1).default('text-embedding-004'),

  GCS_BUCKET: z.string().min(1).optional(),

  // For local/dev without GCS. If true, ingestion stores file bytes in DB only.
  DISABLE_GCS: z.coerce.boolean().default(false),

  // RAG defaults
  CHUNK_TARGET_TOKENS: z.coerce.number().int().positive().default(700),
  CHUNK_OVERLAP_TOKENS: z.coerce.number().int().nonnegative().default(120),
  RETRIEVE_CANDIDATES: z.coerce.number().int().positive().default(10),
  RETRIEVE_TOP_K: z.coerce.number().int().positive().default(5),

  // ---- Lab2Venture: LLM generation (Claude) ----
  // Optional so the app boots without it; agent calls fail clearly if unset.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  LLM_PROVIDER: z.enum(['anthropic', 'vertex']).default('anthropic'),
  LLM_MODEL: z.string().min(1).default('claude-sonnet-4-6'),

  // ---- Lab2Venture: upload limits + local storage + auto-recommend ----
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(20),
  MAX_PAGES: z.coerce.number().int().positive().default(50),
  STORAGE_DIR: z.string().min(1).default('./storage'),
  // When true, the ingestion job auto-enqueues a (separate) recommendation job.
  AUTO_RECOMMEND: boolish.default(false),

  // How many chunks to retrieve per fixed query when building the context package.
  CONTEXT_PER_QUERY_K: z.coerce.number().int().positive().default(4),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv): Env {
  return envSchema.parse(env);
}
