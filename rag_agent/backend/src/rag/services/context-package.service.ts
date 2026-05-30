import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { EnvService } from '../../config/env.service';
import { RetrieveService } from './retrieve.service';

/** The 9 fixed commercialisation queries (doc §14.2). Order matters for dedup. */
export const FIXED_QUERIES: Array<{ intent: string; query: string }> = [
  {
    intent: 'core_contribution',
    query: 'What is the main technical contribution of this research?',
  },
  { intent: 'problem', query: 'What problem does this research solve?' },
  { intent: 'methods', query: 'What methods does this research use?' },
  {
    intent: 'evaluation',
    query: 'What experiments, evaluations, or results are described?',
  },
  {
    intent: 'applications',
    query: 'What real-world applications are mentioned?',
  },
  {
    intent: 'limitations',
    query: 'What limitations or future work are mentioned?',
  },
  {
    intent: 'industries',
    query: 'What industries or users could benefit from this?',
  },
  {
    intent: 'technical_maturity',
    query: 'What evidence suggests technical maturity?',
  },
  {
    intent: 'commercial_relevance',
    query: 'What evidence suggests commercial relevance?',
  },
];

export interface RetrievedChunk {
  chunkId: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface ContextPackage {
  documentId: string;
  metadata: Record<string, unknown> | null;
  retrievedByQuery: Array<{
    intent: string;
    query: string;
    chunks: RetrievedChunk[];
  }>;
  systemNotes: string[];
}

@Injectable()
export class ContextPackageService {
  constructor(
    private readonly db: DbService,
    private readonly env: EnvService,
    private readonly retrieve: RetrieveService,
  ) {}

  /**
   * Build the evidence base for the agents: run each fixed query, dedupe chunks
   * by id across queries (a chunk appears under the first intent that surfaced
   * it), and attach metadata + the standing caveats (doc §7.6 / §10.4).
   */
  async build(documentId: string): Promise<ContextPackage> {
    const k = this.env.env.CONTEXT_PER_QUERY_K;
    const seen = new Set<string>();
    const retrievedByQuery: ContextPackage['retrievedByQuery'] = [];

    // Embed all 9 fixed queries in a single request, then search per query.
    const perQuery = await this.retrieve.retrieveForDocumentBatch(
      documentId,
      FIXED_QUERIES.map((f) => f.query),
      k,
    );

    FIXED_QUERIES.forEach(({ intent, query }, i) => {
      const fresh = (perQuery[i] ?? []).filter((r) => !seen.has(r.chunkId));
      fresh.forEach((r) => seen.add(r.chunkId));
      retrievedByQuery.push({ intent, query, chunks: fresh });
    });

    const metadata = await this.loadMetadata(documentId);

    return {
      documentId,
      metadata,
      retrievedByQuery,
      systemNotes: [
        'Source: a single uploaded PDF only.',
        'IP / patent status is NOT assessed in this MVP.',
        'No external validation (pilots, deployments, revenue) has been performed.',
      ],
    };
  }

  private async loadMetadata(
    documentId: string,
  ): Promise<Record<string, unknown> | null> {
    const { rows } = await this.db.query<{
      metadata: Record<string, unknown> | null;
    }>(`SELECT metadata FROM documents WHERE id = $1`, [documentId]);
    return rows[0]?.metadata ?? null;
  }
}

/** Render a context package into the cacheable prompt block shared by all agents. */
export function renderContextPackage(pkg: ContextPackage): string {
  const parts: string[] = [];

  parts.push('# SYSTEM NOTES');
  parts.push(pkg.systemNotes.map((n) => `- ${n}`).join('\n'));

  if (pkg.metadata) {
    parts.push('\n# RESEARCH ASSET METADATA');
    parts.push(JSON.stringify(pkg.metadata, null, 2));
  }

  parts.push('\n# RETRIEVED CONTEXT (grouped by intent)');
  for (const group of pkg.retrievedByQuery) {
    if (!group.chunks.length) continue;
    parts.push(`\n## ${group.intent} — "${group.query}"`);
    for (const c of group.chunks) {
      const page = c.pageNumber != null ? ` (p.${c.pageNumber})` : '';
      parts.push(`[chunk ${c.chunkIndex}${page}] ${c.content}`);
    }
  }

  return parts.join('\n');
}
