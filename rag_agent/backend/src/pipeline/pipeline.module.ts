import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { StorageModule } from '../storage/storage.module';
import { JobsModule } from '../jobs/jobs.module';
import { AgentsModule } from '../agents/agents.module';
import { IngestionRunner } from './ingestion.runner';
import { RecommendationRunner } from './recommendation.runner';
import { RecommendationController } from './recommendation.controller';

/** Owns the two async pipeline runners (JOB A ingestion, JOB B recommendation). */
@Module({
  imports: [RagModule, StorageModule, JobsModule, AgentsModule],
  controllers: [RecommendationController],
  providers: [IngestionRunner, RecommendationRunner],
  exports: [IngestionRunner, RecommendationRunner],
})
export class PipelineModule {}
