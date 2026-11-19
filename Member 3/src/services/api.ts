/// <reference path="../types/env.d.ts" />
import { browserDemo, demoFetch, demoIdentityStorage, tokenKey } from "../../../Member 1/src/services/demoTransport";
import type { ApiError } from "../types/admin";
import { resolveAdminApiBaseUrl } from "./config";

/**
 * Small fetch wrapper scoped to Member 3.
 * Set VITE_CARELOOP_API_URL in the host app when the team API is available.
 */
const API_BASE_URL = browserDemo ? "" : resolveAdminApiBaseUrl(
  import.meta.env.VITE_CARELOOP_API_URL,
  import.meta.env.VITE_API_BASE_URL,
);

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await demoFetch(new URL(`${API_BASE_URL}${path}`, window.location.origin), {
    ...init,
    headers: {
      Accept: "application/json",
      // Same synthetic demo identity as Member 1; never rely on backend admin fallback.
      ...(typeof localStorage !== "undefined" && demoIdentityStorage().getItem(tokenKey)
        ? { Authorization: `Bearer ${demoIdentityStorage().getItem(tokenKey)}` }
        : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    // This demo API does not use cross-origin cookies; wildcard CORS permits non-credentialed requests.
    credentials: "omit",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as Partial<ApiError>;
      if (body.message) message = body.message;
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw Object.assign(new Error(message), { status: response.status });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
