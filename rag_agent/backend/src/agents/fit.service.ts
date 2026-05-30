import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { LlmService } from '../llm/llm.service';
import { SHARED_AGENT_RULES } from './shared-rules';
import { fitSchema, FitResult } from './schemas/fit.schema';

const FIT_ON_DEMAND_INSTRUCTIONS = `You are scoring how well a SPECIFIC user-supplied profile (an investor, founder, or company) fits this research-backed startup opportunity.
Score 0-100 using: domain_fit (0-25), stage_fit (0-15), business_model_fit (0-15), technical_risk_fit (0-15), customer_access_fit (0-10), founder_skill_fit (0-10), risk_tolerance_fit (0-10).
Base your judgement only on the supplied opportunity, readiness, and profile. Give a clear reason, concrete concerns, and recommended next steps for this specific party.`;

/** On-demand investor/founder fit (plan §6.9). Synchronous — one LLM call. */
@Injectable()
export class FitService {
  constructor(
    private readonly db: DbService,
    private readonly llm: LlmService,
  ) {}

  async run(
    documentId: string,
    profile: Record<string, unknown>,
  ): Promise<FitResult> {
    const docExists = await this.db.query<{ id: string }>(
      `SELECT id FROM documents WHERE id = $1`,
      [documentId],
    );
    if (!docExists.rows[0]) throw new NotFoundException('Asset not found');

    const { rows } = await this.db.query<{
      startup_opportunity: unknown;
      commercial_readiness: unknown;
    }>(
      `SELECT startup_opportunity, commercial_readiness
       FROM recommendations
       WHERE document_id = $1 AND startup_opportunity IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [documentId],
    );
    if (!rows[0]) {
      throw new ConflictException(
        'No recommendation yet — run POST /assets/:id/recommend first.',
      );
    }

    const result = await this.llm.generate({
      agentName: 'investor_fit_on_demand',
      documentId,
      jobId: null,
      system: SHARED_AGENT_RULES,
      user: `${FIT_ON_DEMAND_INSTRUCTIONS}

# STARTUP OPPORTUNITY
${JSON.stringify(rows[0].startup_opportunity)}

# COMMERCIAL READINESS
${JSON.stringify(rows[0].commercial_readiness)}

# PROFILE TO ASSESS
${JSON.stringify(profile)}`,
      schema: fitSchema,
      maxTokens: 1536,
    });

    await this.db.query(
      `INSERT INTO fit_analyses (document_id, input_profile, result)
       VALUES ($1, $2::jsonb, $3::jsonb)`,
      [documentId, JSON.stringify(profile), JSON.stringify(result)],
    );

    return result;
  }
}
