import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnvModule } from './config/env.module';
import { DbModule } from './db/db.module';
import { AgentsModule } from './agents/agents.module';
import { RagModule } from './rag/rag.module';
import { LlmModule } from './llm/llm.module';
import { StorageModule } from './storage/storage.module';
import { JobsModule } from './jobs/jobs.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { AssetsModule } from './assets/assets.module';

@Module({
  imports: [
    EnvModule,
    DbModule,
    RagModule,
    LlmModule,
    StorageModule,
    JobsModule,
    PipelineModule,
    AssetsModule,
    AgentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
