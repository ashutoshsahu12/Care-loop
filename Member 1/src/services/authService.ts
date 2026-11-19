import { api, isDemoMode, tokenKey } from "./api";
import type { Role, User } from "../types";

export const demoUsers: User[] = [
  { id: "U-001", name: "Avery Morgan", email: "admin@careloop.demo", role: "admin", initials: "AM" },
  { id: "U-002", name: "Dr. Maya Chen", email: "doctor@careloop.demo", role: "doctor", initials: "MC", specialty: "Primary care" },
  { id: "U-003", name: "Jordan Lee", email: "worker@careloop.demo", role: "worker", initials: "JL" },
  { id: "U-004", name: "Olivia Rhye", email: "patient@careloop.demo", role: "patient", initials: "OR", patientId: "CL-2048" },
];

export const authService = {
  async login(email: string, password: string): Promise<User> {
    if (!isDemoMode) {
      const { data } = await api.post<{ access_token: string; user: User }>("/auth/login", { email, password });
      localStorage.setItem(tokenKey, data.access_token);
      return data.user;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const user = demoUsers.find((item) => item.email === email);
    if (!user || !password.trim()) throw new Error("Choose a demo account and enter any password to continue.");
    return user;
  },
  async logout(): Promise<void> {
    if (!isDemoMode) await api.post("/auth/logout");
    localStorage.removeItem(tokenKey);
  },
  roleHome(role: Role): string {
    return role === "admin" ? "/dashboard/admin" : role === "doctor" ? "/dashboard/doctor" : role === "worker" ? "/dashboard/worker" : "/dashboard/patient";
  },
};
