import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import { AuthService } from "../src/services/authService";
import type { ID1Database } from "../src/db/client";

describe("Auth and Role Permissions", () => {
  let db: ID1Database;
  let authService: AuthService;

  beforeEach(() => {
    const fresh = getFreshRouter();
    db = fresh.db;
    authService = new AuthService(db);
  });

  it("resolves user from x-user-id header", async () => {
    const request = new Request("http://localhost/api/cases", {
      headers: { "x-user-id": "usr-clin-1" },
    });
    const user = await authService.resolveUser(request);
    expect(user.id).toBe("usr-clin-1");
    expect(user.role).toBe("clinician");
  });

  it("resolves user from Bearer role or token", async () => {
    const request = new Request("http://localhost/api/cases", {
      headers: { Authorization: "Bearer care_worker" },
    });
    const user = await authService.resolveUser(request);
    expect(user.role).toBe("care_worker");
  });

  it("allows authorized roles and rejects unauthorized roles", () => {
    const clinician = {
      id: "usr-clin-1",
      name: "Dr. Neha Verma",
      email: "n.verma@careloop.local",
      role: "clinician" as const,
      createdAt: "",
      updatedAt: "",
    };

    const patient = {
      id: "usr-pt-1001",
      name: "Kavita Sundaram",
      email: "kavita.s@demo.local",
      role: "patient" as const,
      createdAt: "",
      updatedAt: "",
    };

    expect(() => authService.checkPermission(clinician, ["clinician", "admin"])).not.toThrow();

    expect(() => authService.checkPermission(patient, ["clinician", "admin"])).toThrow(/Forbidden/);
  });

  it("enforces role permission check at API boundary for verified closure", async () => {
    const { router } = getFreshRouter();

    // Patient attempting to close a case
    const patientReq = new Request("http://localhost/api/cases/CL-1004/close", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "patient",
      },
      body: JSON.stringify({
        outcome: "care_completed",
        evidenceNote: "Self reported complete treatment",
      }),
    });

    const patientRes = await router.handle(patientReq);
    expect(patientRes.status).toBe(403);
    const body = (await patientRes.json()) as { message: string };
    expect(body.message).toMatch(/Forbidden/);
  });

  it("prevents patients from accessing admin dashboard APIs", async () => {
    const { router } = getFreshRouter();
    const paths = [
      "/api/admin/overview",
      "/api/admin/cases",
      "/api/admin/escalations",
      "/api/admin/at-risk",
      "/api/admin/analytics",
    ];
    for (const path of paths) {
      const response = await router.handle(new Request(`http://localhost${path}`, {
        headers: { "x-user-role": "patient" },
      }));
      expect(response.status, path).toBe(403);
    }
  });

  it("still allows a development administrator to access admin dashboards", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/admin/overview", {
      headers: { "x-user-role": "admin" },
    }));
    expect(response.status).toBe(200);
  });
});
