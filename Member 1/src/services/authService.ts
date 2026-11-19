import { isDemoMode, tokenKey } from "./api";
import type { Role, User } from "../types";
import { BACKEND_DEMO_PATIENT_REF } from "./backendBridge";

export const demoUsers: User[] = [
  { id: "U-001", name: "Avery Morgan", email: "admin@careloop.demo", role: "admin", initials: "AM" },
  { id: "U-002", name: "Dr. Maya Chen", email: "doctor@careloop.demo", role: "doctor", initials: "MC", specialty: "Primary care" },
  { id: "U-003", name: "Jordan Lee", email: "worker@careloop.demo", role: "worker", initials: "JL" },
  { id: "U-004", name: "Olivia Rhye", email: "patient@careloop.demo", role: "patient", initials: "OR", patientId: "CL-2048" },
];

export const authService = {
  async login(email: string, password: string): Promise<User> {
    if (!isDemoMode) {
      // Hackathon-only role selection: Member 2 resolves role tokens against synthetic seed users.
      // This is NOT password authentication and must never be used with real patient data.
      const account = demoUsers.find(item => item.email === email);
      if (!account || !password.trim()) throw new Error("Select a demo account and enter any password.");
      // Use exact seeded user IDs so audit events match the signed-in demo persona.
      const connectedAccounts: Record<Role, Pick<User, "id" | "name" | "initials">> = {
        admin: { id: "usr-admin-1", name: "Dr. Vikram Patel", initials: "VP" },
        doctor: { id: "usr-clin-1", name: "Dr. Neha Verma", initials: "NV" },
        worker: { id: "usr-cw-1", name: "A. Sharma", initials: "AS" },
        patient: { id: "usr-pt-1001", name: "Kavita Sundaram", initials: "KS" },
      };
      const profile = { ...account, ...connectedAccounts[account.role] };
      localStorage.setItem(tokenKey, profile.id);
      return account.role === "patient" ? { ...profile, patientId: BACKEND_DEMO_PATIENT_REF } : profile;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const user = demoUsers.find((item) => item.email === email);
    if (!user || !password.trim()) throw new Error("Choose a demo account and enter any password to continue.");
    return user;
  },
  async logout(): Promise<void> {
    // The synthetic backend has no session/logout endpoint; clear local demo role token.
    localStorage.removeItem(tokenKey);
  },
  roleHome(role: Role): string {
    return role === "admin" ? "/dashboard/admin" : role === "doctor" ? "/dashboard/doctor" : role === "worker" ? "/dashboard/worker" : "/dashboard/patient";
  },
};
