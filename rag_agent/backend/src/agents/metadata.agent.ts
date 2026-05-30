import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { SHARED_AGENT_RULES } from './shared-rules';
import { METADATA_INSTRUCTIONS } from './prompts/metadata.prompt';
import { metadataSchema, Metadata } from './schemas/metadata.schema';

/** Doc §6.8 — runs inside JOB A (ingestion) to populate documents.metadata. */
@Injectable()
export class MetadataAgent {
  constructor(private readonly llm: LlmService) {}

  async extract(params: {
    documentId: string;
    jobId?: string | null;
    text: string;
  }): Promise<Metadata> {
    return this.llm.generate({
      agentName: 'metadata',
      documentId: params.documentId,
      jobId: params.jobId,
      system: SHARED_AGENT_RULES,
      user: `${METADATA_INSTRUCTIONS}\n\nResearch paper text (may be truncated):\n\n${params.text}`,
      schema: metadataSchema,
      maxTokens: 2048,
    });
  }
}
