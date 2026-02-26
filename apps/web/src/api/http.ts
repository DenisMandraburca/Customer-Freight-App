import type { ApiEnvelope, ApiErrorEnvelope } from '@/types/models';
import { portalLoginUrl } from '@/config/runtime';

type LegacyEnvelope<T> = { data: T };

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.toLowerCase().includes('application/json');
}

function readAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function parseError(response: Response): Promise<ApiRequestError> {
  if (!isJsonResponse(response)) {
    return new ApiRequestError(`Request failed (${response.status})`, 'HTTP_ERROR', response.status);
  }

  const body = (await response.json()) as Partial<ApiErrorEnvelope> & { error?: string; message?: string };

  if (body.success === false) {
    return new ApiRequestError(
      body.message ?? 'Request failed.',
      body.error ?? 'HTTP_ERROR',
      response.status,
    );
  }

  return new ApiRequestError(
    body.message ?? body.error ?? `Request failed (${response.status})`,
    body.error ?? 'HTTP_ERROR',
    response.status,
  );
}

export async function http<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('content-type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }

  if (!headers.has('authorization')) {
    const token = readAuthToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers,
  });

  if (response.status === 401) {
    window.location.href = portalLoginUrl;
    throw new ApiRequestError('Unauthorized', 'UNAUTHORIZED', 401);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function unwrap<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const envelope = await http<ApiEnvelope<T> | LegacyEnvelope<T>>(input, init);

  if ('success' in envelope) {
    return envelope.data;
  }

  return envelope.data;
}

export async function unwrapEnvelope<T>(input: RequestInfo | URL, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const envelope = await http<ApiEnvelope<T> | LegacyEnvelope<T>>(input, init);

  if ('success' in envelope) {
    return envelope;
  }

  return {
    success: true,
    data: envelope.data,
  };
}
