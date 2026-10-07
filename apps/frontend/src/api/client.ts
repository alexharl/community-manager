import type { ApiErrorBody } from '@cm/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  /** Objekte werden als JSON gesendet, FormData unverändert (Uploads). */
  body?: unknown;
  headers?: Record<string, string>;
}

/** fetch-Wrapper für `/api`: JSON rein/raus, Fehler im API-Format werden zu `ApiError`. */
export async function api<T>(
  path: string,
  { body, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Server nicht erreichbar.');
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Lädt eine Datei (z. B. eine PDF) – Fehler wie bei `api` als `ApiError`. */
export async function apiBlob(path: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Server nicht erreichbar.');
  }
  if (!response.ok) throw await toApiError(response);
  return response.blob();
}

async function toApiError(response: Response): Promise<ApiError> {
  const data = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    response.status,
    data?.error.code ?? 'HTTP_ERROR',
    data?.error.message ?? `Anfrage fehlgeschlagen (${response.status}).`,
  );
}
