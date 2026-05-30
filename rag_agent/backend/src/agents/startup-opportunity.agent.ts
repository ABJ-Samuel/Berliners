import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { SHARED_AGENT_RULES } from './shared-rules';
import { STARTUP_OPPORTUNITY_INSTRUCTIONS } from './prompts/recommendation.prompts';
import {
  startupOpportunitySchema,
  StartupOpportunity,
} from './schemas/startup-opportunity.schema';
import { AgentRunBase } from './research-understanding.agent';
import { ResearchUnderstanding } from './schemas/research-understanding.schema';
import { CommercialReadiness } from './schemas/commercial-readiness.schema';

@Injectable()
export class StartupOpportunityAgent {
  constructor(private readonly llm: LlmService) {}

  run(
    input: AgentRunBase & {
      research: ResearchUnderstanding;
      readiness: CommercialReadiness;
    },
  ): Promise<StartupOpportunity> {
    return this.llm.generate({
      agentName: 'startup_opportunity',
      documentId: input.documentId,
      jobId: input.jobId,
      system: SHARED_AGENT_RULES,
      cachedContext: input.cachedContext,
      user: `${STARTUP_OPPORTUNITY_INSTRUCTIONS}

# PRIOR ANALYSIS — Research Understanding
${JSON.stringify(input.research)}

# PRIOR ANALYSIS — Commercial Readiness
${JSON.stringify(input.readiness)}`,
      schema: startupOpportunitySchema,
    });
  }
}
