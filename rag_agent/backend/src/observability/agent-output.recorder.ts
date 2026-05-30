import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface AgentOutputRow {
  documentId: string;
  jobId?: string | null;
  agentName: string;
  model: string;
  inputSummary: string;
  output: unknown;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
}

/** Persists one audit row per LLM call (plan §6.6). Never throws. */
@Injectable()
export class AgentOutputRecorder {
  private readonly logger = new Logger(AgentOutputRecorder.name);

  constructor(private readonly db: DbService) {}

  async record(row: AgentOutputRow): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO agent_outputs
           (document_id, job_id, agent_name, model, input_summary, output,
            latency_ms, prompt_tokens, completion_tokens, cache_read_tokens)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)`,
        [
          row.documentId,
          row.jobId ?? null,
          row.agentName,
          row.model,
          row.inputSummary.slice(0, 2000),
          JSON.stringify(row.output ?? null),
          row.latencyMs,
          row.promptTokens,
          row.completionTokens,
          row.cacheReadTokens,
        ],
      );
    } catch (e) {
      this.logger.warn(
        `Failed to record agent_output (${row.agentName}): ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }
}
