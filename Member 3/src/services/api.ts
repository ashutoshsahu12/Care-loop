/// <reference path="../types/env.d.ts" />
import type { ApiError } from "../types/admin";

/**
 * Small fetch wrapper scoped to Member 3.
 * Set VITE_CARELOOP_API_URL in the host app when the team API is available.
 */
const API_BASE_URL = (
  import.meta.env.VITE_CARELOOP_API_URL ?? ""
).replace(/\/$/, "");

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      // Same synthetic demo identity as Member 1; never rely on backend admin fallback.
      ...(typeof localStorage !== "undefined" && localStorage.getItem("careloop.accessToken")
        ? { Authorization: `Bearer ${localStorage.getItem("careloop.accessToken")}` }
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
