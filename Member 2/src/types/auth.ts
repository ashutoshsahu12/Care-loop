export type UserRole = "admin" | "clinician" | "care_worker" | "patient";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContext {
  user: User;
  token?: string;
}
