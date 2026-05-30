import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { SHARED_AGENT_RULES, IP_NOTE, bandForScore } from './shared-rules';
import { COMMERCIAL_READINESS_INSTRUCTIONS } from './prompts/recommendation.prompts';
import {
  commercialReadinessSchema,
  CommercialReadiness,
} from './schemas/commercial-readiness.schema';
import { AgentRunBase } from './research-understanding.agent';
import { ResearchUnderstanding } from './schemas/research-understanding.schema';

@Injectable()
export class CommercialReadinessAgent {
  constructor(private readonly llm: LlmService) {}

  async run(
    input: AgentRunBase & { research: ResearchUnderstanding },
  ): Promise<CommercialReadiness> {
    const result = await this.llm.generate({
      agentName: 'commercial_readiness',
      documentId: input.documentId,
      jobId: input.jobId,
      system: SHARED_AGENT_RULES,
      cachedContext: input.cachedContext,
      user: `${COMMERCIAL_READINESS_INSTRUCTIONS}\n\n# PRIOR ANALYSIS — Research Understanding\n${JSON.stringify(
        input.research,
      )}`,
      schema: commercialReadinessSchema,
    });

    // Deterministic guarantees: canonical IP note + band derived from score.
    return { ...result, ip_note: IP_NOTE, band: bandForScore(result.score) };
  }
}
