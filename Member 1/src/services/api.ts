import axios from "axios";

import { browserDemo, demoFetch, demoIdentityStorage, tokenKey } from "./demoTransport";
export const api = axios.create({
  baseURL: browserDemo ? "/api" : import.meta.env.VITE_API_BASE_URL || "http://localhost:8787/api",
  ...(browserDemo ? { adapter: "fetch", env: { fetch: demoFetch } } : {}),
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = demoIdentityStorage().getItem(tokenKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type BackendApiError = {
  detail?: string;
  message?: string;
  errors?: Array<{ path?: string; message: string }>;
};

export function apiErrorMessage(response?: BackendApiError): string | undefined {
  const validationMessage = response?.errors?.map(item =>
    item.path ? `${item.path}: ${item.message}` : item.message
  ).join("; ");
  return response?.message === "Validation Error" && validationMessage
    ? validationMessage
    : response?.message || response?.detail || validationMessage;
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message = apiErrorMessage(error.response?.data as BackendApiError | undefined);
      return Promise.reject(new Error(message || error.message || "Unable to reach CARELOOP services."));
    }
    return Promise.reject(error);
  },
);

export const isDemoMode = !browserDemo && !import.meta.env.VITE_API_BASE_URL;
export { demoIdentityStorage, tokenKey };
