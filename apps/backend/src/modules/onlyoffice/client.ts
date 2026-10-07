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

// Fehlercodes der Conversion API
const CONVERSION_ERRORS: Record<number, string> = {
  [-1]: 'unbekannter Fehler',
  [-2]: 'Zeitüberschreitung bei der Konvertierung',
  [-3]: 'Konvertierungsfehler',
  [-4]: 'Dokument konnte nicht geladen werden',
  [-5]: 'Dokument ist passwortgeschützt',
  [-6]: 'Datenbankfehler im Document Server',
  [-7]: 'ungültige Anfrage',
  [-8]: 'Token ungültig',
};

export function conversionErrorMessage(code: number): string {
  return `PDF-Erzeugung fehlgeschlagen: ${CONVERSION_ERRORS[code] ?? `Fehler ${code}`}.`;
}

interface ConvertResponse {
  endConvert?: boolean;
  fileUrl?: string;
  error?: number;
}

/**
 * Conversion API (synchron). Der `key` identifiziert den Stand – der DS cacht Ergebnisse je Key.
 * Liefert die URL der fertigen Datei auf dem Document Server.
 */
export async function convertDocument(
  config: OnlyofficeConfig,
  params: { key: string; url: string; title: string; filetype: string; outputtype: string },
): Promise<string> {
  const result = await postToDocumentServer<ConvertResponse>(config, '/converter', {
    async: false,
    ...params,
  });
  if (result.error) {
    throw new AppError(502, 'PDF_CONVERSION_FAILED', conversionErrorMessage(result.error));
  }
  if (!result.endConvert || !result.fileUrl) {
    throw new AppError(504, 'PDF_CONVERSION_TIMEOUT', 'Die PDF-Erzeugung dauert zu lange – bitte erneut versuchen.');
  }
  return result.fileUrl;
}

/** Ersetzt den Host einer DS-URL (z. B. Callback-Download) durch die interne Adresse. */
export function toInternalUrl(config: OnlyofficeConfig, url: string): string {
  const parsed = new URL(url);
  return `${config.internalUrl}${parsed.pathname}${parsed.search}`;
}
