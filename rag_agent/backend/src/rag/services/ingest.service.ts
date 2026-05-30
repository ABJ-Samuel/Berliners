import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { ChunkerService } from './chunker.service';
import { PdfParserService } from './pdf-parser.service';
import { VertexEmbeddingsService } from './vertex-embeddings.service';
import { toPgVector } from './pgvector';
import { GcsStorageService } from './gcs-storage.service';

@Injectable()
export class IngestService {
  constructor(
    private readonly db: DbService,
    private readonly gcs: GcsStorageService,
    private readonly pdf: PdfParserService,
    private readonly chunker: ChunkerService,
    private readonly embedder: VertexEmbeddingsService,
  ) {}

  async ingestPdf(params: {
    tenantId: string;
    filename: string;
    bytes: Buffer;
  }): Promise<{
    documentId: string;
    chunksInserted: number;
    gcsUri: string | null;
  }> {
    const { gcsUri } = await this.gcs.uploadPdf(params);

    const pages = await this.pdf.parsePdfToPages(params.bytes);
    const chunks = this.chunker.chunkPages(pages);

    // Embed in batches. Keep conservative batch size to avoid large payloads.
    const batchSize = 64;
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const { embeddings: batchEmbeddings } = await this.embedder.embedBatch(
        batch.map((c) => c.content),
      );
      embeddings.push(...batchEmbeddings);
    }

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: chunks=${chunks.length} embeddings=${embeddings.length}`,
      );
    }

    const { rows: docRows } = await this.db.query<{ id: string }>(
      `
        INSERT INTO documents (tenant_id, filename, gcs_uri)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [params.tenantId, params.filename, gcsUri],
    );
    const documentId = docRows[0].id;

    await this.db.withClient(async (client) => {
      await client.query('BEGIN');
      try {
        for (let i = 0; i < chunks.length; i += 1) {
          const c = chunks[i];
          const e = embeddings[i];
          await client.query(
            `
              INSERT INTO chunks (document_id, content, embedding, page_number, chunk_index)
              VALUES ($1, $2, $3::vector, $4, $5)
            `,
            [
              documentId,
              c.content,
              toPgVector(e),
              c.pageNumber ?? null,
              c.chunkIndex,
            ],
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    });

    return {
      documentId,
      chunksInserted: chunks.length,
      gcsUri,
    };
  }
}
