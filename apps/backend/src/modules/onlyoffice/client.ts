import type { Config } from '../../config';
import { AppError } from '../../lib/errors';
import { signToken } from './jwt';

type OnlyofficeConfig = Config['onlyoffice'];

/**
 * POST an den Document Server (Backend → DS). Das Token steht im Body und zusätzlich im
 * Authorization-Header, damit es unabhängig von der DS-Einstellung `inbox.inBody` akzeptiert wird.
 */
async function postToDocumentServer<T>(
  config: OnlyofficeConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const [bodyToken, headerToken] = await Promise.all([
    signToken(body, config.jwtSecret),
    signToken({ payload: body }, config.jwtSecret),
  ]);

  let response: Response;
  try {
    response = await fetch(`${config.internalUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${headerToken}`,
      },
      body: JSON.stringify({ ...body, token: bodyToken }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new AppError(502, 'ONLYOFFICE_UNAVAILABLE', 'Document Server nicht erreichbar.');
  }
  if (!response.ok) {
    throw new AppError(502, 'ONLYOFFICE_ERROR', `Document Server antwortet mit ${response.status}.`);
  }
  return (await response.json()) as T;
}

/**
 * Command Service. Relevante Fehlercodes für `forcesave`:
 * 0 = ok (Callback mit Status 6 folgt), 1 = keine Sitzung zum Key, 4 = keine Änderungen.
 */
export function sendCommand(config: OnlyofficeConfig, command: { c: string; key: string }) {
  return postToDocumentServer<{ error: number }>(config, '/command', command);
}

/** Ersetzt den Host einer DS-URL (z. B. Callback-Download) durch die interne Adresse. */
export function toInternalUrl(config: OnlyofficeConfig, url: string): string {
  const parsed = new URL(url);
  return `${config.internalUrl}${parsed.pathname}${parsed.search}`;
}
