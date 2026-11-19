import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import type { AppRouter } from "../src/routes/router";
import type { PatientPortalSummary } from "../src/types/patient";

describe("Patient Portal & Member 1 Integration Contracts", () => {
  let router: AppRouter;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
  });

  it("GET /api/patient/summary returns patient care loop journey and transparent progress", async () => {
    const res = await router.handle(new Request("http://localhost/api/patient/summary?patientId=pat-1001"));
    expect(res.status).toBe(200);
    const summary = (await res.json()) as PatientPortalSummary;

    // Verify patient profile
    expect(summary.patient).toBeDefined();
    expect(summary.patient.patientReference).toBe("CL-P-1001");
    expect(summary.patient.name).toBe("Kavita Sundaram");

    // Verify active care journey
    expect(summary.activeCase).toBeDefined();
    expect(summary.activeCase?.id).toBe("CL-1001");
    expect(summary.activeCase?.statusDisplay).toBe("Screening Under Review");
    expect(Array.isArray(summary.activeCase?.journeySteps)).toBe(true);
    expect(summary.activeCase?.journeySteps.length).toBe(4);

    // Verify screening summary is patient-friendly and non-diagnostic
    expect(summary.activeCase?.screeningSummary).toContain("Screening registered");
    expect(summary.activeCase?.nextStep).toBeDefined();

    // Verify notifications
    expect(Array.isArray(summary.unreadNotifications)).toBe(true);
    expect(summary.unreadNotifications.length).toBeGreaterThan(0);
  });

  it("GET /api/patient/profile returns patient demographics", async () => {
    const res = await router.handle(new Request("http://localhost/api/patient/profile?patientId=pat-1001"));
    expect(res.status).toBe(200);
    const profile = (await res.json()) as any;
    expect(profile.patientReference).toBe("CL-P-1001");
    expect(profile.name).toBe("Kavita Sundaram");
  });

  it("GET /api/patient/appointments returns upcoming appointments for patient", async () => {
    const res = await router.handle(new Request("http://localhost/api/patient/appointments?patientId=pat-1003"));
    expect(res.status).toBe(200);
    const appointments = (await res.json()) as any[];
    expect(Array.isArray(appointments)).toBe(true);
    expect(appointments.length).toBeGreaterThan(0);
    expect(appointments[0].facility).toContain("Mandya");
  });

  it("allows patient to acknowledge notifications and records audit log", async () => {
    const ackReq = new Request("http://localhost/api/notifications/notif-1001/acknowledge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-pt-1001",
        "x-user-role": "patient",
      },
      body: JSON.stringify({
        notes: "Confirmed receipt on patient mobile portal",
      }),
    });

    const res = await router.handle(ackReq);
    expect(res.status).toBe(200);
    const acked = (await res.json()) as any;
    expect(acked.status).toBe("acknowledged");
    expect(acked.acknowledgedAt).toBeDefined();
  });
});
