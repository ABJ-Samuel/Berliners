import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { EnvService } from '../config/env.service';

export interface StructuredCallResult {
  data: unknown;
  usage: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    cacheReadTokens: number;
  };
}

interface SystemBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

/**
 * Claude provider. Structured output is obtained via forced tool-use: the model
 * must call a single tool whose input_schema is the agent's JSON schema, so the
 * tool input is the structured object. The shared context block is marked with
 * cache_control so repeated agent calls reuse it (prompt caching).
 */
@Injectable()
export class AnthropicProvider {
  private client: Anthropic | null = null;
  private readonly model: string;

  constructor(private readonly env: EnvService) {
    this.model = this.env.env.LLM_MODEL;
  }

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = this.env.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set — required for LLM generation.',
      );
    }
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  async generateStructured(opts: {
    system: string;
    cachedContext?: string;
    user: string;
    jsonSchema: Record<string, unknown>;
    maxTokens: number;
  }): Promise<StructuredCallResult> {
    const client = this.getClient();

    const system: SystemBlock[] = [{ type: 'text', text: opts.system }];
    if (opts.cachedContext) {
      system.push({
        type: 'text',
        text: opts.cachedContext,
        cache_control: { type: 'ephemeral' },
      });
    }

    const response = await client.messages.create({
      model: this.model,
      max_tokens: opts.maxTokens,
      system,
      messages: [{ role: 'user', content: opts.user }],
      tools: [
        {
          name: 'emit_result',
          description: 'Return the structured result for this step.',
          // zod-generated JSON Schema; typed loosely to satisfy the SDK.
          input_schema: opts.jsonSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'emit_result' },
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Model did not return a tool_use block');
    }

    const u = response.usage;
    return {
      data: toolUse.input,
      usage: {
        model: this.model,
        promptTokens: u.input_tokens ?? 0,
        completionTokens: u.output_tokens ?? 0,
        cacheReadTokens: u.cache_read_input_tokens ?? 0,
      },
    };
  }
}
