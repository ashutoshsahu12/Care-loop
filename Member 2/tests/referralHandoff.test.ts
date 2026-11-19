import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import type { AppRouter } from "../src/routes/router";
import type { ID1Database } from "../src/db/client";

describe("Referrals and Clinician Handoffs", () => {
  let router: AppRouter;
  let db: ID1Database;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
    db = fresh.db;
  });

  it("creates a referral and updates case status to referred", async () => {
    const req = new Request("http://localhost/api/cases/CL-1001/referrals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-clin-1",
      },
      body: JSON.stringify({
        targetFacility: "District Cardiology Centre",
        specialty: "Cardiology",
        urgency: "urgent",
        notes: "Elevated BP unresponsive to basic lifestyle protocol",
        handoffClinicianId: "usr-clin-2",
        handoffNotes: "Transferring care to Dr. Gupta for echocardiogram review",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(201);
    const referral = (await res.json()) as any;
    expect(referral.id).toMatch(/^ref-/);
    expect(referral.targetFacility).toBe("District Cardiology Centre");
    expect(referral.status).toBe("pending_acceptance");

    // Case status should now be 'referred'
    const caseRow = await db
      .prepare("SELECT status, next_action FROM cases WHERE id = 'CL-1001'")
      .first<{ status: string; next_action: string }>();
    expect(caseRow?.status).toBe("referred");
    expect(caseRow?.next_action).toContain("District Cardiology Centre");

    // Timeline should have referral_created and clinician_handoff events
    const events = await db
      .prepare("SELECT event_type FROM case_events WHERE case_id = 'CL-1001' ORDER BY created_at DESC")
      .all<{ event_type: string }>();
    const types = (events.results || []).map((e) => e.event_type);
    expect(types).toContain("referral_created");
    expect(types).toContain("clinician_handoff");
  });

  it("updates referral status and updates next action", async () => {
    const req = new Request("http://localhost/api/referrals/ref-1002", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-clin-2",
      },
      body: JSON.stringify({
        status: "accepted",
        notes: "Accepted by Dr. Gupta. Clinic slot available on Friday.",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(200);
    const updated = (await res.json()) as any;
    expect(updated.status).toBe("accepted");

    const caseRow = await db
      .prepare("SELECT next_action FROM cases WHERE id = 'CL-1002'")
      .first<{ next_action: string }>();
    expect(caseRow?.next_action).toBe("Schedule consultation with specialist");
  });

  it("executes clinician-to-clinician handoff with structured notes and audit logging", async () => {
    const req = new Request("http://localhost/api/referrals/ref-1002/handoff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-clin-1",
      },
      body: JSON.stringify({
        targetClinicianId: "usr-clin-2",
        targetFacility: "Regional Ophthalmology Institute",
        handoffNotes: "Urgent laser photocoagulation assessment required. Full fundus photos transmitted.",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(200);
    const updated = (await res.json()) as any;
    expect(updated.handoffClinicianId).toBe("usr-clin-2");
    expect(updated.targetFacility).toBe("Regional Ophthalmology Institute");

    // Case next action updated
    const caseRow = await db
      .prepare("SELECT next_action FROM cases WHERE id = 'CL-1002'")
      .first<{ next_action: string }>();
    expect(caseRow?.next_action).toContain("Dr. Rajesh Gupta");

    // Case timeline event recorded
    const event = await db
      .prepare(
        "SELECT event_type, summary FROM case_events WHERE case_id = 'CL-1002' AND event_type = 'clinician_handoff' ORDER BY created_at DESC"
      )
      .first<any>();
    expect(event).toBeDefined();
    expect(event.summary).toContain("Dr. Rajesh Gupta");
  });
});
