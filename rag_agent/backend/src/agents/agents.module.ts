import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { LlmModule } from '../llm/llm.module';
import { AgentController } from './agent.controller';
import { AgentRouterService } from './agent-router.service';
import { MetadataAgent } from './metadata.agent';
import { ResearchUnderstandingAgent } from './research-understanding.agent';
import { CommercialReadinessAgent } from './commercial-readiness.agent';
import { StartupOpportunityAgent } from './startup-opportunity.agent';
import { InvestorFitAgent } from './investor-fit.agent';
import { VentureBriefAgent } from './venture-brief.agent';
import { RecommendationOrchestrator } from './recommendation.orchestrator';
import { FitService } from './fit.service';

@Module({
  imports: [RagModule, LlmModule],
  controllers: [AgentController],
  providers: [
    AgentRouterService,
    MetadataAgent,
    ResearchUnderstandingAgent,
    CommercialReadinessAgent,
    StartupOpportunityAgent,
    InvestorFitAgent,
    VentureBriefAgent,
    RecommendationOrchestrator,
    FitService,
  ],
  exports: [MetadataAgent, RecommendationOrchestrator, FitService],
})
export class AgentsModule {}
