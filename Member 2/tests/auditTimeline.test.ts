import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import type { AppRouter } from "../src/routes/router";
import type { ID1Database } from "../src/db/client";

describe("Immutable Audit Event Recording & Case Timeline", () => {
  let router: AppRouter;
  let db: ID1Database;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
    db = fresh.db;
  });

  it("retrieves the chronological timeline of events for a case", async () => {
    const req = new Request("http://localhost/api/cases/CL-1002/timeline");
    const res = await router.handle(req);
    expect(res.status).toBe(200);
    const events = (await res.json()) as any[];

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(3);

    // Verify chronological order
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1].createdAt).getTime();
      const curr = new Date(events[i].createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }

    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain("case_created");
    expect(eventTypes).toContain("referral_created");
    expect(eventTypes).toContain("clinician_handoff");
  });

  it("records immutable events on every important state mutation", async () => {
    // 1. Assign case
    await router.handle(
      new Request("http://localhost/api/cases/CL-1007/assign", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "usr-cw-1",
        },
        body: JSON.stringify({
          ownerId: "usr-cw-1",
          reason: "Triage assignment for blood pressure monitoring",
        }),
      })
    );

    // 2. Schedule appointment
    await router.handle(
      new Request("http://localhost/api/cases/CL-1007/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "usr-cw-1",
        },
        body: JSON.stringify({
          scheduledTime: "2026-11-28T09:00:00Z",
          facility: "Belgaum District Hospital",
          providerName: "Dr. Vikram Patel",
        }),
      })
    );

    const timelineRes = await router.handle(new Request("http://localhost/api/cases/CL-1007/timeline"));
    const events = (await timelineRes.json()) as any[];
    const types = events.map((e) => e.eventType);

    expect(types).toContain("case_assigned");
    expect(types).toContain("appointment_scheduled");
  });

  it("strictly prohibits update or deletion of case_events at database level", async () => {
    // Attempting to update an existing audit event should fail via SQLite trigger
    await expect(
      db.prepare("UPDATE case_events SET summary = 'Tampered summary' WHERE id = 'evt-1001-1'").run()
    ).rejects.toThrow(/immutable audit log/);

    // Attempting to delete an audit event should fail via SQLite trigger
    await expect(
      db.prepare("DELETE FROM case_events WHERE id = 'evt-1001-1'").run()
    ).rejects.toThrow(/immutable audit log/);
  });

  it("strictly prohibits update or deletion of closure_records at database level", async () => {
    // Attempting to update a closure record should fail via SQLite trigger
    await expect(
      db.prepare("UPDATE closure_records SET evidence_note = 'Tampered note' WHERE id = 'cls-1005'").run()
    ).rejects.toThrow(/closure_records are immutable/);

    // Attempting to delete a closure record should fail via SQLite trigger
    await expect(
      db.prepare("DELETE FROM closure_records WHERE id = 'cls-1005'").run()
    ).rejects.toThrow(/closure_records are immutable/);
  });
});
