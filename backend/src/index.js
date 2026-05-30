import { config } from './config.js';
import { createApp } from './app.js';
import { migrate, waitForDb, pool } from './db.js';

async function main() {
  await waitForDb();
  await migrate();
  // eslint-disable-next-line no-console
  console.log('Datenbank verbunden und Schema migriert.');

  const app = createApp();
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API läuft auf ${config.publicBaseUrl} (Port ${config.port})`);
    // eslint-disable-next-line no-console
    console.log(`Basis-Pfad: ${config.apiBasePath} | Testseite: ${config.publicBaseUrl}/test-oauth`);
  });

  // Graceful Shutdown.
  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} empfangen – fahre herunter ...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Start fehlgeschlagen:', err);
  process.exit(1);
});
