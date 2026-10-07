import { buildApp } from './app';
import { loadConfig } from './config';
import { createDb } from './db/db';
import { migrateToLatest } from './db/migrate';
import { ensureDataDirs } from './lib/files';
import { failInterruptedDispatches } from './modules/dispatches/service';

const config = loadConfig();
const db = createDb(config.databaseUrl);
const app = await buildApp(config, db);

try {
  await ensureDataDirs(config.dataDir);
  await migrateToLatest(db, app.log);
  const interrupted = await failInterruptedDispatches(db);
  if (interrupted > 0)
    app.log.warn(`${interrupted} unterbrochene Versendung(en) als fehlgeschlagen markiert`);
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info(`${signal} empfangen, fahre herunter …`);
    await app.close();
    process.exit(0);
  });
}
