import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  /** true when the server could not be reached at all (offline, DNS, timeout) */
  offline: boolean;
  constructor(message: string, status: number, offline = false) {
    super(message);
    this.status = status;
    this.offline = offline;
  }
}

type Options = { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown; token?: string | null; timeoutMs?: number };

export async function api<T>(path: string, { method = 'GET', body, token, timeoutMs = 15000 }: Options = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('No connection to the AURA server. Check your internet and try again.', 0, true);
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Server error (${res.status}). Please try again.`, res.status);
  }
  return data as T;
}
