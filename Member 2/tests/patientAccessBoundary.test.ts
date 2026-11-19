import { describe, expect, it } from "vitest";
import { getFreshRouter } from "./helpers/testDb";

describe("patient-only synthetic data access", () => {
  const identity = { Authorization: "Bearer usr-pt-1001" };

  it("returns only the signed-in patient's cases", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/cases", { headers: identity }));
    expect(response.status).toBe(200);
    const cases = await response.json() as Array<{ id: string; patientReference: string }>;
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.every(item => item.patientReference === "CL-P-1001")).toBe(true);
  });

  it("blocks requests for another patient's details, timeline and profile", async () => {
    const { router } = getFreshRouter();
    for (const path of [
      "/api/cases/CL-1002",
      "/api/cases/CL-1002/timeline",
      "/api/cases/CL-1002/referrals",
      "/api/cases/CL-1002/appointments",
      "/api/cases/CL-1002/tasks",
      "/api/cases/CL-1002/notifications",
      "/api/patients/pat-1002",
      "/api/patient/summary?patientId=pat-1002",
      "/api/patient/appointments?patientId=pat-1002",
    ]) {
      const response = await router.handle(new Request(`http://localhost${path}`, { headers: identity }));
      expect(response.status, path).toBe(403);
    }
  });

  it("resolves own summary from the seeded user's linked email without a patientId query", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/patient/summary", { headers: identity }));
    expect(response.status).toBe(200);
    const summary = await response.json() as { patient: { patientReference: string } };
    expect(summary.patient.patientReference).toBe("CL-P-1001");
  });

  it("blocks acknowledging staff-directed notifications with a patient role", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/notifications/notif-1008/acknowledge", {
      method: "POST",
      headers: { ...identity, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(403);
  });

  it("preserves staff and admin access to synthetic case lists", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/cases", {
      headers: { Authorization: "Bearer usr-admin-1" },
    }));
    expect(response.status).toBe(200);
    const cases = await response.json() as unknown[];
    expect(cases.length).toBeGreaterThanOrEqual(12);
  });
});
