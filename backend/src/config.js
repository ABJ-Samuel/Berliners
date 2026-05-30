// Zentrale Konfiguration. Liest Umgebungsvariablen ein, validiert sie und
// stellt typsichere Defaults bereit. Fehlt etwas Kritisches, bricht der
// Start mit einer klaren Fehlermeldung ab (fail fast).

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }
  return value;
}

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`Umgebungsvariable ${name} muss eine Zahl sein`);
  return parsed;
}

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProd = NODE_ENV === 'production';

// In Produktion dürfen die unsicheren Default-Secrets nicht verwendet werden.
function secret(name) {
  const value = required(name, isProd ? undefined : `dev-only-insecure-${name}`);
  if (isProd && value.startsWith('change-me')) {
    throw new Error(`Unsicheres Secret in Produktion: ${name} muss gesetzt werden`);
  }
  return value;
}

const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API_BASE_PATH = (process.env.API_BASE_PATH ?? '/v1').replace(/\/$/, '');

export const config = {
  nodeEnv: NODE_ENV,
  isProd,
  port: int('PORT', 3000),
  apiBasePath: API_BASE_PATH,
  publicBaseUrl: PUBLIC_BASE_URL,

  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: int('POSTGRES_PORT', 5432),
    database: process.env.POSTGRES_DB ?? 'appdb',
    user: process.env.POSTGRES_USER ?? 'appuser',
    password: process.env.POSTGRES_PASSWORD ?? 'appuser',
  },

  jwt: {
    accessSecret: secret('JWT_ACCESS_SECRET'),
    refreshSecret: secret('JWT_REFRESH_SECRET'),
    stateSecret: secret('JWT_STATE_SECRET'),
    accessTtl: int('ACCESS_TOKEN_TTL', 3600),
    refreshTtl: int('REFRESH_TOKEN_TTL', 60 * 60 * 24 * 30),
  },

  cookieSecret: secret('COOKIE_SECRET'),

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        `${PUBLIC_BASE_URL}${API_BASE_PATH}/auth/oauth/google/callback`,
    },
    postLoginRedirect: process.env.POST_LOGIN_REDIRECT || `${PUBLIC_BASE_URL}/test-oauth`,
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? './uploads',
    maxSizeBytes: int('MAX_UPLOAD_SIZE_MB', 10) * 1024 * 1024,
    // Whitelist erlaubter MIME-Typen (sichere Defaults).
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/json',
      'application/zip',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
};

// Liste der konfigurierten OAuth-Provider (für Validierung der :provider Route).
export const SUPPORTED_PROVIDERS = ['google'];
