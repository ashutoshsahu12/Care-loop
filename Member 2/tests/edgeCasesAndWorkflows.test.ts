import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import type { AppRouter } from "../src/routes/router";
import type { ID1Database } from "../src/db/client";

describe("Edge Cases and Complete Care Coordination Workflows", () => {
  let router: AppRouter;
  let db: ID1Database;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
    db = fresh.db;
  });

  it("handles case reassignment and explicit unassignment", async () => {
    // Reassign CL-1001 to R. Kumar
    const reassignReq = new Request("http://localhost/api/cases/CL-1001/assign", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-admin-1",
      },
      body: JSON.stringify({
        ownerId: "usr-cw-2",
        assignedCareWorkerName: "R. Kumar",
        reason: "Caseload rebalancing",
        nextAction: "Conduct follow-up home visit",
      }),
    });

    const res = await router.handle(reassignReq);
    expect(res.status).toBe(200);
    const updated = (await res.json()) as any;
    expect(updated.ownerId).toBe("usr-cw-2");
    expect(updated.assignedCareWorkerName).toBe("R. Kumar");
    expect(updated.nextAction).toBe("Conduct follow-up home visit");

    // Explicit unassignment
    const unassignReq = new Request("http://localhost/api/cases/CL-1001/assign", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-admin-1",
      },
      body: JSON.stringify({
        ownerId: null,
        reason: "Worker on extended medical leave",
      }),
    });

    const unassignRes = await router.handle(unassignReq);
    expect(unassignRes.status).toBe(200);
    const unassigned = (await unassignRes.json()) as any;
    expect(unassigned.status).toBe("unassigned");
    expect(unassigned.ownerId).toBeNull();
    expect(unassigned.assignedCareWorkerName).toBeNull();
  });

  it("acknowledges notifications and records timeline event", async () => {
    const ackReq = new Request("http://localhost/api/notifications/notif-1001/acknowledge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-pt-1001",
        "x-user-role": "patient",
      },
      body: JSON.stringify({
        notes: "Acknowledged via SMS link",
      }),
    });

    const res = await router.handle(ackReq);
    expect(res.status).toBe(200);
    const acked = (await res.json()) as any;
    expect(acked.status).toBe("acknowledged");
    expect(acked.acknowledgedAt).toBeDefined();

    // Check timeline event
    const events = await db
      .prepare(
        "SELECT event_type, summary FROM case_events WHERE case_id = 'CL-1001' AND event_type = 'patient_acknowledged'"
      )
      .all<any>();
    expect(events.results?.length).toBeGreaterThan(0);
  });

  it("retrieves full composite case details graph", async () => {
    const res = await router.handle(new Request("http://localhost/api/cases/CL-1002"));
    expect(res.status).toBe(200);
    const graph = (await res.json()) as any;

    expect(graph.caseRecord).toBeDefined();
    expect(graph.caseRecord.id).toBe("CL-1002");
    expect(graph.patient).toBeDefined();
    expect(graph.patient.patientReference).toBe("CL-P-1002");
    expect(graph.screeningResult).toBeDefined();
    expect(Array.isArray(graph.referrals)).toBe(true);
    expect(Array.isArray(graph.appointments)).toBe(true);
    expect(Array.isArray(graph.tasks)).toBe(true);
    expect(Array.isArray(graph.timeline)).toBe(true);
  });

  it("handles CORS OPTIONS preflight and headers", async () => {
    const optionsReq = new Request("http://localhost/api/cases", {
      method: "OPTIONS",
    });

    const res = await router.handle(optionsReq);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("returns 400 with detailed Zod validation errors on invalid payloads", async () => {
    const badReq = new Request("http://localhost/api/cases/CL-1001/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-cw-1",
      },
      body: JSON.stringify({
        scheduledTime: "not-a-date",
        facility: "X", // too short
        providerName: "", // missing
      }),
    });

    const res = await router.handle(badReq);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.message).toBe("Validation Error");
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await router.handle(new Request("http://localhost/api/unknown-endpoint"));
    expect(res.status).toBe(404);
  });
});
