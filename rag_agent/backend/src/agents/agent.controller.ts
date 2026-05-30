import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { AgentRouterService } from './agent-router.service';

const runBodySchema = z.object({
  tenantId: z.string().min(1).default('default'),
  query: z.string().min(1),
});

@Controller()
export class AgentController {
  constructor(private readonly router: AgentRouterService) {}

  @Post('/agent/run')
  async run(@Body() body: unknown) {
    const { tenantId, query } = runBodySchema.parse(body);
    return this.router.run({ tenantId, query });
  }
}
