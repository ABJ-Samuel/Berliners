import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { EnvService } from '../config/env.service';

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly env: EnvService) {
    const databaseUrl = this.env.env.DATABASE_URL;

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    const res = await this.pool.query<T>(
      text,
      params ? [...params] : undefined,
    );
    return { rows: res.rows };
  }

  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }
}
