import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Hinter einem Reverse Proxy (z.B. in Produktion) korrekte IP/Protokoll.
  app.set('trust proxy', 1);

  // Minimale Security-Header (sichere Defaults ohne zusätzliche Dependency).
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // CORS für das Frontend (Bearer-Token-Auth, keine Cookies -> credentials nicht nötig).
  // Spiegelt die Origin nur, wenn sie auf der Whitelist steht; beantwortet Preflights.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.cors.origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(config.cookieSecret));

  // Health-Check.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Statische Testseite unter /test-oauth (kleine technische OAuth-Testseite).
  app.use('/test-oauth', express.static(path.join(__dirname, '..', 'public')));

  // API-Routen unter dem konfigurierten Basis-Pfad (Spec: /v1).
  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/users', userRoutes);
  api.use('/documents', documentRoutes);
  app.use(config.apiBasePath, api);

  // 404 + zentrales Error-Handling.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
