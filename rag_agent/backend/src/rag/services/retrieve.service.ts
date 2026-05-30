import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { VertexEmbeddingsService } from './vertex-embeddings.service';
import { toPgVector } from './pgvector';
import { EnvService } from '../../config/env.service';

@Injectable()
export class RetrieveService {
  private readonly candidates: number;
  private readonly topK: number;

  constructor(
    private readonly db: DbService,
    private readonly env: EnvService,
    private readonly embedder: VertexEmbeddingsService,
  ) {
    this.candidates = this.env.env.RETRIEVE_CANDIDATES;
    this.topK = this.env.env.RETRIEVE_TOP_K;
  }

  async retrieve(params: { tenantId: string; query: string }): Promise<{
    query: string;
    results: Array<{
      chunkId: string;
      documentId: string;
      filename: string;
      pageNumber: number | null;
      chunkIndex: number;
      content: string;
      score: number;
    }>;
  }> {
    const { embeddings } = await this.embedder.embedBatch([params.query]);
    const q = embeddings[0];
    if (!q) throw new Error('Failed to embed query');

    const { rows } = await this.db.query<{
      chunk_id: string;
      document_id: string;
      filename: string;
      page_number: number | null;
      chunk_index: number;
      content: string;
      score: number;
    }>(
      `
        SELECT
          c.id AS chunk_id,
          c.document_id,
          d.filename,
          c.page_number,
          c.chunk_index,
          c.content,
          (1 - (c.embedding <=> $2::vector)) AS score
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE d.tenant_id = $1
        ORDER BY c.embedding <=> $2::vector
        LIMIT $3
      `,
      [params.tenantId, toPgVector(q), this.candidates],
    );

    return {
      query: params.query,
      results: rows.slice(0, this.topK).map((r) => ({
        chunkId: r.chunk_id,
        documentId: r.document_id,
        filename: r.filename,
        pageNumber: r.page_number,
        chunkIndex: r.chunk_index,
        content: r.content,
        score: Number(r.score),
      })),
    };
  }

  /** Retrieve the top-k chunks within a single document (for context packaging). */
  async retrieveForDocument(
    documentId: string,
    query: string,
    k: number,
  ): Promise<
    Array<{
      chunkId: string;
      pageNumber: number | null;
      chunkIndex: number;
      content: string;
      score: number;
    }>
  > {
    const { embeddings } = await this.embedder.embedBatch([query]);
    const q = embeddings[0];
    if (!q) throw new Error('Failed to embed query');

    const { rows } = await this.db.query<{
      chunk_id: string;
      page_number: number | null;
      chunk_index: number;
      content: string;
      score: number;
    }>(
      `
        SELECT
          c.id AS chunk_id,
          c.page_number,
          c.chunk_index,
          c.content,
          (1 - (c.embedding <=> $2::vector)) AS score
        FROM chunks c
        WHERE c.document_id = $1
        ORDER BY c.embedding <=> $2::vector
        LIMIT $3
      `,
      [documentId, toPgVector(q), k],
    );

    return rows.map((r) => ({
      chunkId: r.chunk_id,
      pageNumber: r.page_number,
      chunkIndex: r.chunk_index,
      content: r.content,
      score: Number(r.score),
    }));
  }

  /**
   * Embed several queries in ONE call, then run a vector search per query.
   * Used to build the context package without N separate embedding requests
   * (avoids burst quota pressure on the embedding API).
   */
  async retrieveForDocumentBatch(
    documentId: string,
    queries: string[],
    k: number,
  ): Promise<
    Array<
      Array<{
        chunkId: string;
        pageNumber: number | null;
        chunkIndex: number;
        content: string;
        score: number;
      }>
    >
  > {
    if (!queries.length) return [];
    const { embeddings } = await this.embedder.embedBatch(queries);

    const out: Array<
      Array<{
        chunkId: string;
        pageNumber: number | null;
        chunkIndex: number;
        content: string;
        score: number;
      }>
    > = [];
    for (const q of embeddings) {
      const { rows } = await this.db.query<{
        chunk_id: string;
        page_number: number | null;
        chunk_index: number;
        content: string;
        score: number;
      }>(
        `
          SELECT
            c.id AS chunk_id,
            c.page_number,
            c.chunk_index,
            c.content,
            (1 - (c.embedding <=> $2::vector)) AS score
          FROM chunks c
          WHERE c.document_id = $1
          ORDER BY c.embedding <=> $2::vector
          LIMIT $3
        `,
        [documentId, toPgVector(q), k],
      );
      out.push(
        rows.map((r) => ({
          chunkId: r.chunk_id,
          pageNumber: r.page_number,
          chunkIndex: r.chunk_index,
          content: r.content,
          score: Number(r.score),
        })),
      );
    }
    return out;
  }
}
