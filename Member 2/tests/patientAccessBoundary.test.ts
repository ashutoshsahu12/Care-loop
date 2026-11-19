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

  it("keeps internal notes in staff views, including the full case response", async () => {
    const { router } = getFreshRouter();
    const staff = { Authorization: "Bearer usr-clin-1", "Content-Type": "application/json" };
    const patient = { Authorization: "Bearer usr-pt-1001" };
    const url = "http://localhost/api/cases/CL-1001";
    const note = "Internal synthetic clinician note.";
    const created = await router.handle(new Request(url + "/notes", { method: "POST", headers: staff, body: JSON.stringify({ text: note }) }));
    expect(created.status).toBe(201);
    for (const path of [url, url + "/timeline"]) {
      expect(await (await router.handle(new Request(path, { headers: staff }))).text()).toContain(note);
      const patientView = await (await router.handle(new Request(path, { headers: patient }))).text();
      expect(patientView).not.toContain(note);
      expect(patientView).not.toContain("clinicianNotes");
    }
  });

  it("allows the patient to acknowledge a notification addressed to their patient record", async () => {
    const { router } = getFreshRouter();
    const patient = { Authorization: "Bearer usr-pt-1001" };
    const staff = { Authorization: "Bearer usr-cw-1", "Content-Type": "application/json" };
    const base = "http://localhost/api";
    const screening = await router.handle(new Request(base + "/screenings", {
      method: "POST", headers: staff, body: JSON.stringify({ patientId: "pat-1001", screeningType: "cardiovascular", resultValue: "Routine synthetic screening" }),
    }));
    expect(screening.status).toBe(201);
    const notifications = await (await router.handle(new Request(base + "/patient/notifications", { headers: patient }))).json() as { id: string; title: string }[];
    const notification = notifications.find(item => item.title === "Screening Summary Available");
    expect(notification).toBeDefined();
    const url = base + "/notifications/" + notification!.id + "/acknowledge";
    expect((await router.handle(new Request(url, { method: "POST", headers: staff }))).status).toBe(403);
    const acknowledged = await router.handle(new Request(url, { method: "POST", headers: patient }));
    expect(acknowledged.status).toBe(200);
    expect(await acknowledged.json()).toMatchObject({ id: notification!.id, status: "acknowledged" });
  });
});
