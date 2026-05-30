import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { IngestService } from '../services/ingest.service';

const ingestBodySchema = z.object({
  tenantId: z.string().min(1).default('default'),
});

@Controller()
export class IngestController {
  constructor(private readonly ingest: IngestService) {}

  @Post('/ingest')
  @UseInterceptors(FileInterceptor('file'))
  async ingestPdf(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('Missing multipart file field: file');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only application/pdf is supported');
    }

    const { tenantId } = ingestBodySchema.parse(body ?? {});

    return this.ingest.ingestPdf({
      tenantId,
      filename: file.originalname,
      bytes: file.buffer,
    });
  }
}
