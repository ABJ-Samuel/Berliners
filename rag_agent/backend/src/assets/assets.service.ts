import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { EnvService } from '../config/env.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { JobsService } from '../jobs/jobs.service';
import { IngestionRunner } from '../pipeline/ingestion.runner';

interface DocumentRow {
  id: string;
  tenant_id: string;
  filename: string;
  created_at: string;
  ingest_status: string;
  page_count: number | null;
  metadata: Record<string, unknown> | null;
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly db: DbService,
    private readonly env: EnvService,
    private readonly storage: LocalStorageService,
    private readonly jobs: JobsService,
    private readonly ingestionRunner: IngestionRunner,
  ) {}

  /** POST /assets — validate, persist, kick the (separate) ingestion job. */
  async createFromUpload(params: {
    tenantId: string;
    filename: string;
    bytes: Buffer;
  }): Promise<{ assetId: string; ingestionJobId: string; status: 'QUEUED' }> {
    const maxBytes = this.env.env.MAX_UPLOAD_MB * 1024 * 1024;
    if (!params.bytes?.length) {
      throw new BadRequestException('Uploaded file is empty.');
    }
    if (params.bytes.length > maxBytes) {
      throw new BadRequestException(
        `File exceeds the ${this.env.env.MAX_UPLOAD_MB} MB limit.`,
      );
    }

    const { storagePath } = await this.storage.save(params);

    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO documents (tenant_id, filename, storage_path, byte_size, ingest_status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [params.tenantId, params.filename, storagePath, params.bytes.length],
    );
    const documentId = rows[0].id;

    const job = await this.jobs.create(documentId, 'ingestion');
    // Fire and forget: the ingestion job runs in the background.
    void this.ingestionRunner.run(documentId, job.id);

    return { assetId: documentId, ingestionJobId: job.id, status: 'QUEUED' };
  }

  /** GET /assets — dashboard list with latest job + readiness. */
  async list(tenantId: string) {
    const { rows } = await this.db.query<{
      id: string;
      filename: string;
      created_at: string;
      ingest_status: string;
      title: string | null;
      ing_status: string | null;
      ing_progress: number | null;
      rec_status: string | null;
      rec_progress: number | null;
      rec_step: string | null;
      readiness_score: number | null;
      readiness_band: string | null;
    }>(
      `
      SELECT d.id, d.filename, d.created_at, d.ingest_status,
             d.metadata->>'title' AS title,
             ij.status AS ing_status, ij.progress AS ing_progress,
             rj.status AS rec_status, rj.progress AS rec_progress, rj.current_step AS rec_step,
             r.readiness_score, r.readiness_band
      FROM documents d
      LEFT JOIN LATERAL (
        SELECT status, progress FROM jobs
        WHERE document_id = d.id AND kind = 'ingestion'
        ORDER BY created_at DESC LIMIT 1
      ) ij ON true
      LEFT JOIN LATERAL (
        SELECT status, progress, current_step FROM jobs
        WHERE document_id = d.id AND kind = 'recommendation'
        ORDER BY created_at DESC LIMIT 1
      ) rj ON true
      LEFT JOIN LATERAL (
        SELECT readiness_score, readiness_band FROM recommendations
        WHERE document_id = d.id ORDER BY created_at DESC LIMIT 1
      ) r ON true
      WHERE d.tenant_id = $1
      ORDER BY d.created_at DESC
      `,
      [tenantId],
    );

    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? r.filename,
      filename: r.filename,
      upload_time: r.created_at,
      ingest_status: r.ingest_status,
      ingestion: r.ing_status
        ? { status: r.ing_status, progress: r.ing_progress }
        : null,
      recommendation: r.rec_status
        ? {
            status: r.rec_status,
            progress: r.rec_progress,
            current_step: r.rec_step,
          }
        : null,
      readiness_score:
        r.readiness_score != null ? Number(r.readiness_score) : null,
      readiness_band: r.readiness_band,
    }));
  }

  async getDocumentOrThrow(documentId: string): Promise<DocumentRow> {
    const { rows } = await this.db.query<DocumentRow>(
      `SELECT id, tenant_id, filename, created_at, ingest_status, page_count, metadata
       FROM documents WHERE id = $1`,
      [documentId],
    );
    if (!rows[0]) throw new NotFoundException('Asset not found');
    return rows[0];
  }

  /**
   * GET /assets/:id — the canonical result object (plan §7 / doc §15),
   * assembled from documents + the two latest jobs + the latest recommendation.
   * Recommendation blocks are null until JOB B has run (Phase 4).
   */
  async getResultObject(documentId: string) {
    const doc = await this.getDocumentOrThrow(documentId);
    const ingestion = await this.jobs.getLatest(documentId, 'ingestion');
    const recJob = await this.jobs.getLatest(documentId, 'recommendation');
    const rec = await this.getLatestRecommendation(documentId);

    const metadata = doc.metadata ?? null;
    const title =
      (metadata?.['title'] as string | undefined) ?? doc.filename ?? null;

    return {
      research_asset: {
        id: doc.id,
        title,
        filename: doc.filename,
        upload_time: doc.created_at,
      },
      ingestion: ingestion
        ? { status: ingestion.status, progress: ingestion.progress }
        : null,
      recommendation: recJob
        ? {
            status: recJob.status,
            progress: recJob.progress,
            current_step: recJob.current_step,
          }
        : null,
      metadata,
      commercial_readiness: rec?.commercial_readiness ?? null,
      startup_opportunity: rec?.startup_opportunity ?? null,
      investor_founder_fit: rec?.investor_founder_fit ?? null,
      venture_brief: rec?.venture_brief ?? null,
    };
  }

  /** GET /assets/:id/brief — the venture brief (markdown + sections). */
  async getBrief(documentId: string) {
    await this.getDocumentOrThrow(documentId);
    const rec = await this.getLatestRecommendation(documentId);
    if (!rec || !rec.venture_brief) {
      throw new NotFoundException(
        'No venture brief yet — run POST /assets/:id/recommend first.',
      );
    }
    const vb = rec.venture_brief as Record<string, unknown>;
    return {
      title: vb.title ?? null,
      one_liner: vb.one_liner ?? null,
      markdown_content: rec.brief_md ?? vb.markdown_content ?? null,
      sections: vb.sections ?? null,
    };
  }

  /** GET /assets/:id/agent-outputs — the audit trail for this asset. */
  async getAgentOutputs(documentId: string) {
    await this.getDocumentOrThrow(documentId);
    const { rows } = await this.db.query(
      `SELECT id, job_id, agent_name, model, latency_ms,
              prompt_tokens, completion_tokens, cache_read_tokens, created_at
       FROM agent_outputs WHERE document_id = $1 ORDER BY created_at ASC`,
      [documentId],
    );
    return rows;
  }

  async getLatestRecommendation(documentId: string) {
    const { rows } = await this.db.query<{
      id: string;
      commercial_readiness: unknown;
      startup_opportunity: unknown;
      investor_founder_fit: unknown;
      venture_brief: unknown;
      brief_md: string | null;
      readiness_score: number | null;
      readiness_band: string | null;
    }>(
      `SELECT id, commercial_readiness, startup_opportunity, investor_founder_fit,
              venture_brief, brief_md, readiness_score, readiness_band
       FROM recommendations WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [documentId],
    );
    return rows[0] ?? null;
  }
}
