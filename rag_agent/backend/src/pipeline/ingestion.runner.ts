import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { EnvService } from '../config/env.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { PdfParserService } from '../rag/services/pdf-parser.service';
import { ChunkerService } from '../rag/services/chunker.service';
import { VertexEmbeddingsService } from '../rag/services/vertex-embeddings.service';
import { toPgVector } from '../rag/services/pgvector';
import { JobsService } from '../jobs/jobs.service';
import { MetadataAgent } from '../agents/metadata.agent';
import { RecommendationRunner } from './recommendation.runner';

export const SCANNED_PDF_MESSAGE =
  'This PDF appears to be image-based or scanned. Please upload a text-based PDF.';

/**
 * JOB A — ingestion. Runs in-process, fire-and-forget. Never throws to the
 * caller; failures are recorded on the job + documents.ingest_status.
 */
@Injectable()
export class IngestionRunner {
  private readonly logger = new Logger(IngestionRunner.name);

  constructor(
    private readonly db: DbService,
    private readonly env: EnvService,
    private readonly storage: LocalStorageService,
    private readonly pdf: PdfParserService,
    private readonly chunker: ChunkerService,
    private readonly embedder: VertexEmbeddingsService,
    private readonly jobs: JobsService,
    private readonly metadata: MetadataAgent,
    private readonly recommendation: RecommendationRunner,
  ) {}

  async run(documentId: string, jobId: string): Promise<void> {
    try {
      await this.jobs.setProgress(jobId, 10, 'Saving PDF');
      const doc = await this.loadDocument(documentId);
      if (!doc?.storage_path) throw new Error('Document has no stored file path');

      await this.jobs.setProgress(jobId, 30, 'Extracting text');
      const bytes = await this.storage.read(doc.storage_path);
      const pages = await this.pdf.parsePdfToPages(bytes);

      const pageCount = pages.length;
      const totalChars = pages.reduce((n, p) => n + p.text.trim().length, 0);
      const maxPages = this.env.env.MAX_PAGES;

      if (pageCount === 0) {
        throw new Error('Could not read any pages from the PDF.');
      }
      if (pageCount > maxPages) {
        throw new Error(`PDF has ${pageCount} pages; the limit is ${maxPages}.`);
      }
      // Scanned/empty detection: a text PDF yields far more than ~50 chars/page.
      if (totalChars < Math.max(100, pageCount * 50)) {
        throw new Error(SCANNED_PDF_MESSAGE);
      }

      await this.db.query(
        `UPDATE documents SET page_count = $2, updated_at = now() WHERE id = $1`,
        [documentId, pageCount],
      );

      await this.jobs.setProgress(jobId, 45, 'Cleaning text');
      await this.jobs.setProgress(jobId, 60, 'Chunking document');
      const chunks = this.chunker.chunkPages(pages);
      if (!chunks.length) throw new Error('No chunks were produced from the PDF.');

      await this.jobs.setProgress(jobId, 85, 'Creating embeddings');
      const embeddings = await this.embedAll(chunks.map((c) => c.content));
      if (embeddings.length !== chunks.length) {
        throw new Error(
          `Embedding count mismatch: chunks=${chunks.length} embeddings=${embeddings.length}`,
        );
      }

      // Idempotent re-ingest: replace any existing chunks for this document.
      await this.db.withClient(async (client) => {
        await client.query('BEGIN');
        try {
          await client.query(`DELETE FROM chunks WHERE document_id = $1`, [
            documentId,
          ]);
          for (let i = 0; i < chunks.length; i += 1) {
            const c = chunks[i];
            await client.query(
              `INSERT INTO chunks (document_id, content, embedding, page_number, chunk_index, section)
               VALUES ($1, $2, $3::vector, $4, $5, $6)`,
              [
                documentId,
                c.content,
                toPgVector(embeddings[i]),
                c.pageNumber ?? null,
                c.chunkIndex,
                null,
              ],
            );
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      });

      await this.jobs.setProgress(jobId, 95, 'Extracting metadata');
      // Best-effort: metadata enrichment must not fail ingestion. If the LLM is
      // unavailable (e.g. no ANTHROPIC_API_KEY) the asset still becomes ready.
      try {
        const text = pages
          .map((p) => p.text)
          .join('\n\n')
          .slice(0, 24000);
        const metadata = await this.metadata.extract({
          documentId,
          jobId,
          text,
        });
        await this.db.query(
          `UPDATE documents SET metadata = $2::jsonb, updated_at = now() WHERE id = $1`,
          [documentId, JSON.stringify(metadata)],
        );
      } catch (e) {
        this.logger.warn(
          `Metadata extraction skipped for ${documentId}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }

      await this.db.query(
        `UPDATE documents SET ingest_status = 'ready', updated_at = now() WHERE id = $1`,
        [documentId],
      );
      await this.jobs.complete(jobId, 'Ready');
      this.logger.log(
        `Ingestion completed for ${documentId} (${chunks.length} chunks, ${pageCount} pages)`,
      );

      // Optional auto-chain — still a SEPARATE recommendation job (kept apart).
      if (this.env.env.AUTO_RECOMMEND) {
        const recJob = await this.jobs.create(documentId, 'recommendation');
        void this.recommendation.run(documentId, recJob.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ingestion failed for ${documentId}: ${message}`);
      await this.jobs.fail(jobId, message).catch(() => undefined);
      await this.db
        .query(
          `UPDATE documents SET ingest_status = 'failed', updated_at = now() WHERE id = $1`,
          [documentId],
        )
        .catch(() => undefined);
    }
  }

  private async loadDocument(id: string) {
    const { rows } = await this.db.query<{
      id: string;
      storage_path: string | null;
    }>(`SELECT id, storage_path FROM documents WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  private async embedAll(texts: string[]): Promise<number[][]> {
    const batchSize = 64;
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const { embeddings } = await this.embedder.embedBatch(
        texts.slice(i, i + batchSize),
      );
      out.push(...embeddings);
    }
    return out;
  }
}
