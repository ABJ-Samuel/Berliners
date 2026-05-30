import { Injectable } from '@nestjs/common';
import { z, ZodType } from 'zod';
import { EnvService } from '../config/env.service';
import { AnthropicProvider } from './anthropic.provider';
import { AgentOutputRecorder } from '../observability/agent-output.recorder';

export interface GenerateOptions<T> {
  /** Used for the agent_outputs audit row. */
  agentName: string;
  documentId: string;
  jobId?: string | null;
  /** Shared grounding rules + this agent's instructions. */
  system: string;
  /** Large shared block (the context package) — cached across agents. */
  cachedContext?: string;
  /** The variable, per-call content (prior agent outputs, the question, etc.). */
  user: string;
  schema: ZodType<T>;
  maxTokens?: number;
}

/**
 * Provider-agnostic structured generation. Validates the model output against
 * the zod schema (retrying once with the validation error fed back), and records
 * an agent_outputs audit row on success.
 */
@Injectable()
export class LlmService {
  constructor(
    private readonly env: EnvService,
    private readonly anthropic: AnthropicProvider,
    private readonly recorder: AgentOutputRecorder,
  ) {}

  async generate<T>(opts: GenerateOptions<T>): Promise<T> {
    if (this.env.env.LLM_PROVIDER !== 'anthropic') {
      throw new Error(
        `LLM_PROVIDER '${this.env.env.LLM_PROVIDER}' is not implemented yet (only 'anthropic').`,
      );
    }

    const jsonSchema = toAnthropicSchema(opts.schema);
    const maxTokens = opts.maxTokens ?? 3072;
    const started = Date.now();
    let user = opts.user;
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await this.anthropic.generateStructured({
        system: opts.system,
        cachedContext: opts.cachedContext,
        user,
        jsonSchema,
        maxTokens,
      });

      const parsed = opts.schema.safeParse(result.data);
      if (parsed.success) {
        await this.recorder.record({
          documentId: opts.documentId,
          jobId: opts.jobId,
          agentName: opts.agentName,
          model: result.usage.model,
          inputSummary: `${opts.system.slice(0, 160)} || ${opts.user.slice(0, 240)}`,
          output: parsed.data,
          latencyMs: Date.now() - started,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          cacheReadTokens: result.usage.cacheReadTokens,
        });
        return parsed.data;
      }

      lastError = parsed.error;
      user =
        `${opts.user}\n\n---\nYour previous response did not match the required schema. ` +
        `Validation errors:\n${JSON.stringify(parsed.error.issues).slice(0, 1500)}\n` +
        `Return a corrected result that matches the schema exactly.`;
    }

    throw new Error(
      `LLM output failed schema validation for agent '${opts.agentName}': ${
        lastError instanceof z.ZodError
          ? JSON.stringify(lastError.issues).slice(0, 500)
          : String(lastError)
      }`,
    );
  }
}

function toAnthropicSchema(schema: ZodType<unknown>): Record<string, unknown> {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema;
  return js;
}
