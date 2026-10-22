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
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  return (await response.json()) as T;
}

export type HealthResponse = { status: string };

export const getHealth = () => apiFetch<HealthResponse>('/api/health');
