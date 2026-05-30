import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { SHARED_AGENT_RULES } from './shared-rules';
import { INVESTOR_FIT_INSTRUCTIONS } from './prompts/recommendation.prompts';
import {
  investorFitSchema,
  InvestorFit,
} from './schemas/investor-fit.schema';
import { AgentRunBase } from './research-understanding.agent';
import { StartupOpportunity } from './schemas/startup-opportunity.schema';
import { CommercialReadiness } from './schemas/commercial-readiness.schema';
import { INVESTOR_PROFILES } from '../profiles/investor-profiles';
import { FOUNDER_PROFILES } from '../profiles/founder-profiles';

@Injectable()
export class InvestorFitAgent {
  constructor(private readonly llm: LlmService) {}

  run(
    input: AgentRunBase & {
      opportunity: StartupOpportunity;
      readiness: CommercialReadiness;
    },
  ): Promise<InvestorFit> {
    return this.llm.generate({
      agentName: 'investor_fit',
      documentId: input.documentId,
      jobId: input.jobId,
      system: SHARED_AGENT_RULES,
      cachedContext: input.cachedContext,
      user: `${INVESTOR_FIT_INSTRUCTIONS}

# STARTUP OPPORTUNITY
${JSON.stringify(input.opportunity)}

# COMMERCIAL READINESS
${JSON.stringify(input.readiness)}

# PREDEFINED INVESTOR PROFILES
${JSON.stringify(INVESTOR_PROFILES)}

# PREDEFINED FOUNDER PROFILES
${JSON.stringify(FOUNDER_PROFILES)}`,
      schema: investorFitSchema,
    });
  }
}
