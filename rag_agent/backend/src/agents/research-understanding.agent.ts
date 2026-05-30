import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { SHARED_AGENT_RULES } from './shared-rules';
import { RESEARCH_UNDERSTANDING_INSTRUCTIONS } from './prompts/recommendation.prompts';
import {
  researchUnderstandingSchema,
  ResearchUnderstanding,
} from './schemas/research-understanding.schema';

export interface AgentRunBase {
  documentId: string;
  jobId?: string | null;
  /** Rendered context package — identical across agents so it caches. */
  cachedContext: string;
}

@Injectable()
export class ResearchUnderstandingAgent {
  constructor(private readonly llm: LlmService) {}

  run(input: AgentRunBase): Promise<ResearchUnderstanding> {
    return this.llm.generate({
      agentName: 'research_understanding',
      documentId: input.documentId,
      jobId: input.jobId,
      system: SHARED_AGENT_RULES,
      cachedContext: input.cachedContext,
      user: RESEARCH_UNDERSTANDING_INSTRUCTIONS,
      schema: researchUnderstandingSchema,
    });
  }
}
