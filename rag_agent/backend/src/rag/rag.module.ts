import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { IngestController } from './routes/ingest.controller';
import { RetrieveController } from './routes/retrieve.controller';
import { ChunkerService } from './services/chunker.service';
import { PdfParserService } from './services/pdf-parser.service';
import { VertexEmbeddingsService } from './services/vertex-embeddings.service';
import { GcsStorageService } from './services/gcs-storage.service';
import { IngestService } from './services/ingest.service';
import { RetrieveService } from './services/retrieve.service';
import { ContextPackageService } from './services/context-package.service';

@Module({
  imports: [DbModule],
  controllers: [IngestController, RetrieveController],
  providers: [
    ChunkerService,
    PdfParserService,
    VertexEmbeddingsService,
    GcsStorageService,
    IngestService,
    RetrieveService,
    ContextPackageService,
  ],
  exports: [
    IngestService,
    RetrieveService,
    ContextPackageService,
    PdfParserService,
    ChunkerService,
    VertexEmbeddingsService,
  ],
})
export class RagModule {}
