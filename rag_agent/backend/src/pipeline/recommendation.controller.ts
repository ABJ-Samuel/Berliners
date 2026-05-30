import {
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { RecommendationRunner } from './recommendation.runner';
import { FitService } from '../agents/fit.service';

const fitBodySchema = z.object({
  profile: z.record(z.string(), z.unknown()),
});

/** POST triggers for the recommendation job (reads live in AssetsController). */
@Controller('assets')
export class RecommendationController {
  constructor(
    private readonly db: DbService,
    private readonly jobs: JobsService,
    private readonly runner: RecommendationRunner,
    private readonly fit: FitService,
  ) {}

  @Post(':id/recommend')
  async recommend(@Param('id') id: string) {
    const { rows } = await this.db.query<{ ingest_status: string }>(
      `SELECT ingest_status FROM documents WHERE id = $1`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Asset not found');
    if (rows[0].ingest_status !== 'ready') {
      throw new ConflictException(
        `Asset is not ready for recommendation (ingest_status=${rows[0].ingest_status}). Run/await ingestion first.`,
      );
    }

    const job = await this.jobs.create(id, 'recommendation');
    // Separate, fire-and-forget job — keeps ingestion and recommendation apart.
    void this.runner.run(id, job.id);
    return { recommendationJobId: job.id, status: 'QUEUED' as const };
  }

  @Post(':id/fit')
  async fitOnDemand(@Param('id') id: string, @Body() body: unknown) {
    const { profile } = fitBodySchema.parse(body ?? {});
    return this.fit.run(id, profile);
  }
}
