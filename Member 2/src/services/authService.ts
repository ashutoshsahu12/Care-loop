import type { ID1Database } from "../db/client";
import type { AuthContext, User, UserRole } from "../types/auth";

export class AuthService {
  private db: ID1Database;

  constructor(db: ID1Database) {
    this.db = db;
  }

  async resolveUser(request: Request): Promise<User> {
    // Check custom headers for easy testing and API client integration
    const headerUserId = request.headers.get("x-user-id");
    const headerRole = request.headers.get("x-user-role") as UserRole | null;

    if (headerUserId) {
      const user = await this.getUserById(headerUserId);
      if (user) return user;
    }

    // Check Authorization header (Bearer <userId> or Bearer <role>)
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const user = await this.getUserById(token);
      if (user) return user;

      // Allow Bearer admin, Bearer clinician, etc. for quick testing
      if (["admin", "clinician", "care_worker", "patient"].includes(token)) {
        const roleUser = await this.getUserByRole(token as UserRole);
        if (roleUser) return roleUser;
      }
    }

    if (headerRole && ["admin", "clinician", "care_worker", "patient"].includes(headerRole)) {
      const roleUser = await this.getUserByRole(headerRole);
      if (roleUser) return roleUser;
    }

    // Default to admin user for permissive dev fallback
    const defaultUser = await this.getUserByRole("admin");
    if (defaultUser) return defaultUser;

    return {
      id: "usr-admin-default",
      name: "Default Admin",
      email: "admin@careloop.local",
      role: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const res = await this.db
      .prepare(
        "SELECT id, name, email, role, phone, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?"
      )
      .bind(id)
      .first<User>();
    return res;
  }

  async getUserByRole(role: UserRole): Promise<User | null> {
    const res = await this.db
      .prepare(
        "SELECT id, name, email, role, phone, created_at as createdAt, updated_at as updatedAt FROM users WHERE role = ? LIMIT 1"
      )
      .bind(role)
      .first<User>();
    return res;
  }

  checkPermission(user: User, allowedRoles: UserRole[]): void {
    if (!allowedRoles.includes(user.role)) {
      throw new Error(
        `Forbidden: User role '${user.role}' is not authorized. Required: [${allowedRoles.join(", ")}]`
      );
    }
  }
}
