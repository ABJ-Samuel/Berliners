import { Injectable, Logger } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { RecommendationOrchestrator } from '../agents/recommendation.orchestrator';

/** JOB B — recommendation. Fire-and-forget; records failure on the job. */
@Injectable()
export class RecommendationRunner {
  private readonly logger = new Logger(RecommendationRunner.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly orchestrator: RecommendationOrchestrator,
  ) {}

  async run(documentId: string, jobId: string): Promise<void> {
    try {
      await this.jobs.setProgress(jobId, 5, 'Starting');
      await this.orchestrator.run({
        documentId,
        jobId,
        onProgress: (progress, step) =>
          this.jobs.setProgress(jobId, progress, step),
      });
      await this.jobs.complete(jobId, 'Completed');
      this.logger.log(`Recommendation completed for ${documentId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Recommendation failed for ${documentId}: ${message}`);
      await this.jobs.fail(jobId, message).catch(() => undefined);
    }
  }
}
