import pg from 'pg';
import { config } from './config.js';

const poolConfig = config.db.connectionString
  ? { connectionString: config.db.connectionString }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
    };

export const pool = new pg.Pool(poolConfig);

export function query(text, params) {
  return pool.query(text, params);
}

// Schema-Migration. Wird beim Start ausgeführt (idempotent dank IF NOT EXISTS),
// sodass die DB unabhängig von der Reihenfolge der Container-Initialisierung
// immer das erwartete Schema hat.
const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            TEXT NOT NULL,
    first_name       TEXT NOT NULL DEFAULT '',
    last_name        TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    type             TEXT NOT NULL DEFAULT 'researcher' CHECK (type IN ('researcher','startup')),
    oauth_provider   TEXT NOT NULL,
    oauth_provider_id TEXT NOT NULL,
    avatar_url       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (oauth_provider, oauth_provider_id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT,
    description TEXT,
    file_name   TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    size        BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
`;

export async function migrate() {
  await pool.query(SCHEMA_SQL);
}

// Wartet, bis die DB Verbindungen annimmt (Container-Startup-Race vermeiden).
export async function waitForDb(retries = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      // eslint-disable-next-line no-console
      console.log(`DB noch nicht bereit (Versuch ${attempt}/${retries}) – warte ${delayMs}ms ...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
