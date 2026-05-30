import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export type JobKind = 'ingestion' | 'recommendation';
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobRow {
  id: string;
  document_id: string;
  kind: JobKind;
  status: JobStatus;
  progress: number;
  current_step: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class JobsService {
  constructor(private readonly db: DbService) {}

  async create(documentId: string, kind: JobKind): Promise<JobRow> {
    const { rows } = await this.db.query<JobRow>(
      `INSERT INTO jobs (document_id, kind, status, progress)
       VALUES ($1, $2, 'QUEUED', 0)
       RETURNING *`,
      [documentId, kind],
    );
    return rows[0];
  }

  /** Mark PROCESSING and record the current step + progress. */
  async setProgress(
    jobId: string,
    progress: number,
    currentStep: string,
  ): Promise<void> {
    await this.db.query(
      `UPDATE jobs
         SET status = 'PROCESSING', progress = $2, current_step = $3, updated_at = now()
       WHERE id = $1`,
      [jobId, progress, currentStep],
    );
  }

  async complete(jobId: string, currentStep = 'Completed'): Promise<void> {
    await this.db.query(
      `UPDATE jobs
         SET status = 'COMPLETED', progress = 100, current_step = $2, updated_at = now()
       WHERE id = $1`,
      [jobId, currentStep],
    );
  }

  async fail(jobId: string, error: string): Promise<void> {
    await this.db.query(
      `UPDATE jobs SET status = 'FAILED', error = $2, updated_at = now() WHERE id = $1`,
      [jobId, error.slice(0, 2000)],
    );
  }

  async get(jobId: string): Promise<JobRow | null> {
    const { rows } = await this.db.query<JobRow>(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId],
    );
    return rows[0] ?? null;
  }

  async getLatest(documentId: string, kind: JobKind): Promise<JobRow | null> {
    const { rows } = await this.db.query<JobRow>(
      `SELECT * FROM jobs
       WHERE document_id = $1 AND kind = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [documentId, kind],
    );
    return rows[0] ?? null;
  }
}
