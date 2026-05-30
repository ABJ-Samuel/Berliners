import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DbService } from './db.service';

@Injectable()
export class MigrationRunner implements OnApplicationBootstrap {
  constructor(private readonly db: DbService) {}

  async onApplicationBootstrap() {
    // Keep this idempotent so local dev can start with an empty DB.
    await this.db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await this.db.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        filename text NOT NULL,
        gcs_uri text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        content text NOT NULL,
        embedding vector(768) NOT NULL,
        page_number int,
        chunk_index int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await this.db.query(
      `CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);`,
    );

    // Approximate nearest neighbor index. Tune list count later.
    await this.db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'chunks_embedding_ivfflat_idx'
        ) THEN
          CREATE INDEX chunks_embedding_ivfflat_idx
          ON chunks USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100);
        END IF;
      END $$;
    `);

    // ---- Lab2Venture: research-asset columns on documents ----
    await this.db.query(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count int;`,
    );
    await this.db.query(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS byte_size bigint;`,
    );
    await this.db.query(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;`,
    );
    await this.db.query(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata jsonb;`,
    );
    await this.db.query(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS ingest_status text NOT NULL DEFAULT 'pending';`,
    );
    await this.db.query(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();`,
    );

    // chunks: optional section label (often null; see plan §10)
    await this.db.query(
      `ALTER TABLE chunks ADD COLUMN IF NOT EXISTS section text;`,
    );

    // ---- jobs: one row per pipeline run; kind = 'ingestion' | 'recommendation' ----
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        kind text NOT NULL,
        status text NOT NULL DEFAULT 'QUEUED',
        progress int NOT NULL DEFAULT 0,
        current_step text,
        error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await this.db.query(
      `CREATE INDEX IF NOT EXISTS jobs_document_kind_idx ON jobs(document_id, kind, created_at DESC);`,
    );

    // ---- recommendations: stored agent outputs (one row per recommendation run) ----
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
        readiness_score numeric,
        readiness_band text,
        research_understanding jsonb,
        commercial_readiness jsonb,
        startup_opportunity jsonb,
        investor_founder_fit jsonb,
        venture_brief jsonb,
        brief_md text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await this.db.query(
      `CREATE INDEX IF NOT EXISTS recommendations_document_id_idx ON recommendations(document_id, created_at DESC);`,
    );

    // ---- agent_outputs: audit row per LLM call ----
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS agent_outputs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
        agent_name text NOT NULL,
        model text,
        input_summary text,
        output jsonb,
        latency_ms int,
        prompt_tokens int,
        completion_tokens int,
        cache_read_tokens int,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await this.db.query(
      `CREATE INDEX IF NOT EXISTS agent_outputs_document_id_idx ON agent_outputs(document_id, created_at DESC);`,
    );

    // ---- fit_analyses: on-demand investor/founder fit (POST /assets/:id/fit) ----
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS fit_analyses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        input_profile jsonb NOT NULL,
        result jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // ---- venture_brief_embeddings: optional (doc §7.2) ----
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS venture_brief_embeddings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        recommendation_id uuid NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
        embedding vector(768) NOT NULL
      );
    `);
  }
}
