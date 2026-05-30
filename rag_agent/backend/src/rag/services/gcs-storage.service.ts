import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { EnvService } from '../../config/env.service';

@Injectable()
export class GcsStorageService {
  private readonly storage: Storage;
  private readonly bucketName?: string;
  private readonly disableGcs: boolean;

  constructor(private readonly env: EnvService) {
    this.storage = new Storage();
    this.bucketName = this.env.env.GCS_BUCKET;
    this.disableGcs = this.env.env.DISABLE_GCS;
  }

  async uploadPdf(params: {
    tenantId: string;
    filename: string;
    bytes: Buffer;
  }): Promise<{ gcsUri: string | null }> {
    if (this.disableGcs) return { gcsUri: null };
    if (!this.bucketName) {
      throw new Error('Missing env.GCS_BUCKET (or set DISABLE_GCS=true)');
    }

    const objectName = `${params.tenantId}/${Date.now()}-${sanitizeFilename(
      params.filename,
    )}`;
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectName);

    await file.save(params.bytes, {
      resumable: false,
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'private, max-age=0, no-transform',
      },
    });

    return { gcsUri: `gs://${this.bucketName}/${objectName}` };
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
