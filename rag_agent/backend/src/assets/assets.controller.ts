import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { AssetsService } from './assets.service';

// FileInterceptor options are evaluated at decoration time, so read the limit
// straight from the environment (mirrors MAX_UPLOAD_MB in EnvService).
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024;

const createBodySchema = z.object({
  tenantId: z.string().min(1).default('default'),
});

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
  ) {
    if (!file) {
      throw new BadRequestException('Missing multipart file field: file');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only application/pdf is supported');
    }
    const { tenantId } = createBodySchema.parse(body ?? {});
    return this.assets.createFromUpload({
      tenantId,
      filename: file.originalname,
      bytes: file.buffer,
    });
  }

  @Get()
  async list(@Query('tenantId') tenantId?: string) {
    return this.assets.list(tenantId && tenantId.length ? tenantId : 'default');
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.assets.getResultObject(id);
  }

  // Explicit alias for the recommendation view (same result object, doc §15).
  @Get(':id/recommendation')
  async recommendation(@Param('id') id: string) {
    return this.assets.getResultObject(id);
  }

  @Get(':id/brief')
  async brief(@Param('id') id: string) {
    return this.assets.getBrief(id);
  }

  @Get(':id/agent-outputs')
  async agentOutputs(@Param('id') id: string) {
    return this.assets.getAgentOutputs(id);
  }
}
