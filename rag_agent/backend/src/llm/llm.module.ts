import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AnthropicProvider } from './anthropic.provider';
import { AgentOutputRecorder } from '../observability/agent-output.recorder';

@Module({
  providers: [LlmService, AnthropicProvider, AgentOutputRecorder],
  exports: [LlmService],
})
export class LlmModule {}
