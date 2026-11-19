import axios from "axios";

const tokenKey = "careloop.accessToken";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { detail?: string } | undefined)?.detail;
      return Promise.reject(new Error(message || error.message || "Unable to reach CARELOOP services."));
    }
    return Promise.reject(error);
  },
);

export const isDemoMode = !import.meta.env.VITE_API_BASE_URL;
export { tokenKey };
