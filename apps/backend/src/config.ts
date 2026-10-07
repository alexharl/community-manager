import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  DATA_DIR: z.string().min(1),
  APP_SECRET: z
    .string()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'muss 32 Byte (base64) lang sein',
    ),
  ONLYOFFICE_PUBLIC_URL: z.url(),
  ONLYOFFICE_INTERNAL_URL: z.url(),
  ONLYOFFICE_JWT_SECRET: z.string().min(16),
  BACKEND_URL_FOR_ONLYOFFICE: z.url(),
  FRONTEND_DIST_DIR: z.string().optional(),
});

export type Config = ReturnType<typeof loadConfig>;

/** Sucht ab `start` aufwärts nach einer .env-Datei (Repo-Root bei `npm run dev -w …`). */
function findEnvFile(start: string): string | undefined {
  let dir = resolve(start);
  for (;;) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

export function loadConfig() {
  const envFile = findEnvFile(process.cwd());
  if (envFile) {
    // Bereits gesetzte Umgebungsvariablen haben Vorrang vor der Datei
    for (const [key, value] of Object.entries(parseEnv(readFileSync(envFile, 'utf8')))) {
      process.env[key] ??= value;
    }
  }

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error(`Ungültige Konfiguration:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }
  const env = result.data;
  // Relative Pfade beziehen sich auf das Verzeichnis der .env-Datei
  const baseDir = envFile ? dirname(envFile) : process.cwd();

  return {
    isProduction: env.NODE_ENV === 'production',
    host: env.HOST,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    dataDir: resolve(baseDir, env.DATA_DIR),
    appSecret: Buffer.from(env.APP_SECRET, 'base64'),
    onlyoffice: {
      publicUrl: trimSlash(env.ONLYOFFICE_PUBLIC_URL),
      internalUrl: trimSlash(env.ONLYOFFICE_INTERNAL_URL),
      jwtSecret: env.ONLYOFFICE_JWT_SECRET,
      backendUrl: trimSlash(env.BACKEND_URL_FOR_ONLYOFFICE),
    },
    frontendDistDir: env.FRONTEND_DIST_DIR ? resolve(baseDir, env.FRONTEND_DIST_DIR) : undefined,
  };
}
