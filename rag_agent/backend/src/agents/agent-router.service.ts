import { Injectable } from '@nestjs/common';
import { RetrieveService } from '../rag/services/retrieve.service';

export type AgentRunInput = {
  tenantId: string;
  query: string;
};

@Injectable()
export class AgentRouterService {
  constructor(private readonly retrieve: RetrieveService) {}

  /**
   * Minimal "multi-agent" scaffold:
   * - routes to sub-agents by intent (currently only retrieval is implemented)
   * - provides a stable place to add planner/tool agents later
   */
  async run(input: AgentRunInput) {
    // Placeholder routing logic (expand later with classifiers / rules).
    const selectedAgent = 'retrieval';
    const retrieval = await this.retrieve.retrieve(input);
    return { selectedAgent, ...retrieval };
  }
}
