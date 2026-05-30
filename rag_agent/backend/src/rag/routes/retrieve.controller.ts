import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { RetrieveService } from '../services/retrieve.service';

const retrieveBodySchema = z.object({
  tenantId: z.string().min(1).default('default'),
  query: z.string().min(1),
});

@Controller()
export class RetrieveController {
  constructor(private readonly retrieve: RetrieveService) {}

  @Post('/retrieve')
  async retrieveChunks(@Body() body: any) {
    const { tenantId, query } = retrieveBodySchema.parse(body ?? {});
    return this.retrieve.retrieve({ tenantId, query });
  }
}
