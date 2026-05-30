import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { SHARED_AGENT_RULES } from './shared-rules';
import { VENTURE_BRIEF_INSTRUCTIONS } from './prompts/recommendation.prompts';
import {
  ventureBriefSchema,
  VentureBrief,
} from './schemas/venture-brief.schema';
import { AgentRunBase } from './research-understanding.agent';
import { ResearchUnderstanding } from './schemas/research-understanding.schema';
import { CommercialReadiness } from './schemas/commercial-readiness.schema';
import { StartupOpportunity } from './schemas/startup-opportunity.schema';
import { InvestorFit } from './schemas/investor-fit.schema';

@Injectable()
export class VentureBriefAgent {
  constructor(private readonly llm: LlmService) {}

  run(
    input: AgentRunBase & {
      research: ResearchUnderstanding;
      readiness: CommercialReadiness;
      opportunity: StartupOpportunity;
      fit: InvestorFit;
    },
  ): Promise<VentureBrief> {
    return this.llm.generate({
      agentName: 'venture_brief',
      documentId: input.documentId,
      jobId: input.jobId,
      system: SHARED_AGENT_RULES,
      cachedContext: input.cachedContext,
      user: `${VENTURE_BRIEF_INSTRUCTIONS}

# RESEARCH UNDERSTANDING
${JSON.stringify(input.research)}

# COMMERCIAL READINESS
${JSON.stringify(input.readiness)}

# STARTUP OPPORTUNITY
${JSON.stringify(input.opportunity)}

# INVESTOR / FOUNDER FIT
${JSON.stringify(input.fit)}`,
      schema: ventureBriefSchema,
      maxTokens: 4096,
    });
  }
}
