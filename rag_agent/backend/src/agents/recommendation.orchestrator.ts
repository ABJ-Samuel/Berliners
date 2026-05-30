import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import {
  ContextPackageService,
  renderContextPackage,
} from '../rag/services/context-package.service';
import { ResearchUnderstandingAgent } from './research-understanding.agent';
import { CommercialReadinessAgent } from './commercial-readiness.agent';
import { StartupOpportunityAgent } from './startup-opportunity.agent';
import { InvestorFitAgent } from './investor-fit.agent';
import { VentureBriefAgent } from './venture-brief.agent';
import { buildBriefSections, renderBriefMarkdown } from './brief-renderer';
import { bandForScore } from './shared-rules';

export type ProgressFn = (
  progress: number,
  step: string,
) => Promise<void> | void;

/** JOB B — runs the 5 agents in sequence and persists a recommendations row. */
@Injectable()
export class RecommendationOrchestrator {
  private readonly logger = new Logger(RecommendationOrchestrator.name);

  constructor(
    private readonly db: DbService,
    private readonly context: ContextPackageService,
    private readonly researchUnderstanding: ResearchUnderstandingAgent,
    private readonly commercialReadiness: CommercialReadinessAgent,
    private readonly startupOpportunity: StartupOpportunityAgent,
    private readonly investorFit: InvestorFitAgent,
    private readonly ventureBrief: VentureBriefAgent,
  ) {}

  async run(params: {
    documentId: string;
    jobId: string;
    onProgress?: ProgressFn;
  }): Promise<{ recommendationId: string }> {
    const { documentId, jobId } = params;
    const onProgress: ProgressFn = params.onProgress ?? (() => undefined);

    await onProgress(10, 'Retrieving context');
    const pkg = await this.context.build(documentId);
    const cachedContext = renderContextPackage(pkg);
    const base = { documentId, jobId, cachedContext };

    await onProgress(25, 'Understanding research');
    const research = await this.researchUnderstanding.run(base);

    await onProgress(45, 'Scoring readiness');
    const readiness = await this.commercialReadiness.run({ ...base, research });

    await onProgress(65, 'Generating opportunity');
    const opportunity = await this.startupOpportunity.run({
      ...base,
      research,
      readiness,
    });

    await onProgress(80, 'Matching investor/founder');
    const fit = await this.investorFit.run({ ...base, opportunity, readiness });

    await onProgress(95, 'Generating venture brief');
    const brief = await this.ventureBrief.run({
      ...base,
      research,
      readiness,
      opportunity,
      fit,
    });

    const sections = buildBriefSections(brief, readiness);
    const briefMd = renderBriefMarkdown(brief, readiness);
    const ventureBriefStored = {
      ...brief,
      markdown_content: briefMd,
      sections,
    };
    const band = bandForScore(readiness.score);

    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO recommendations
         (document_id, job_id, readiness_score, readiness_band,
          research_understanding, commercial_readiness, startup_opportunity,
          investor_founder_fit, venture_brief, brief_md)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10)
       RETURNING id`,
      [
        documentId,
        jobId,
        readiness.score,
        band,
        JSON.stringify(research),
        JSON.stringify(readiness),
        JSON.stringify(opportunity),
        JSON.stringify(fit),
        JSON.stringify(ventureBriefStored),
        briefMd,
      ],
    );

    this.logger.log(
      `Recommendation stored for ${documentId} (score ${readiness.score}, ${band})`,
    );
    return { recommendationId: rows[0].id };
  }
}
