/**
 * Thin typed client for the Spring API (src/api).
 * The base URL comes from EXPO_PUBLIC_API_URL (see .env.example).
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Only JSON string bodies get a JSON content type; FormData etc. set their own,
  // and plain GETs stay "simple" requests so web builds skip the CORS preflight.
  const headers =
    typeof init?.body === 'string' ? { 'Content-Type': 'application/json' } : undefined;
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  // 204 No Content and other empty bodies have nothing to parse.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export type HealthResponse = { status: string };

export const getHealth = () => apiFetch<HealthResponse>('/actuator/health');
