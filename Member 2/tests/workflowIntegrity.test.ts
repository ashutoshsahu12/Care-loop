import { describe, expect, it } from "vitest";
import { getFreshRouter } from "./helpers/testDb";

describe("demo workflow integrity", () => {
  it("reschedules an appointment without creating another row", async () => {
    const { router, db } = getFreshRouter();
    const before = await db.prepare("SELECT COUNT(*) AS count FROM appointments WHERE case_id = ?").bind("CL-1003").first<{ count: number }>();
    const response = await router.handle(new Request("http://localhost/api/appointments/apt-1003", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": "care_worker" },
      body: JSON.stringify({ scheduledTime: "2026-12-05T11:30:00Z" }),
    }));
    expect(response.status).toBe(200);
    const updated = await response.json() as { scheduledTime: string; status: string };
    expect(updated.scheduledTime).toBe("2026-12-05T11:30:00Z");
    expect(updated.status).toBe("scheduled");
    const after = await db.prepare("SELECT COUNT(*) AS count FROM appointments WHERE case_id = ?").bind("CL-1003").first<{ count: number }>();
    expect(after?.count).toBe(before?.count);
    const state = await db.prepare("SELECT status FROM cases WHERE id = ?").bind("CL-1003").first<{ status: string }>();
    expect(state?.status).toBe("appointment_scheduled");
    const events = await db.prepare("SELECT COUNT(*) as count FROM case_events WHERE case_id = ? AND event_type = 'appointment_rescheduled'")
      .bind("CL-1003").first<{count: number}>();
    expect(events?.count).toBe(1);
  });

  it("does not duplicate timeline events on repeated notification acknowledgements", async () => {
    const { router, db } = getFreshRouter();
    const makeRequest = () => new Request("http://localhost/api/notifications/notif-1001/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": "patient" },
      body: JSON.stringify({}),
    });
    expect((await router.handle(makeRequest())).status).toBe(200);
    expect((await router.handle(makeRequest())).status).toBe(200);
    const count = await db.prepare("SELECT COUNT(*) as count FROM case_events WHERE case_id = ? AND event_type = 'patient_acknowledged'")
      .bind("CL-1001").first<{ count: number }>();
    expect(count?.count).toBe(1);
  });

  it("preserves a closed case and rejects referrals from a different case", async () => {
    const { router } = getFreshRouter();
    const schedule = (caseId: string, referralId?: string) => router.handle(new Request(
      `http://localhost/api/cases/${caseId}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "care_worker" },
        body: JSON.stringify({ referralId, scheduledTime: "2026-12-05T11:30:00Z", facility: "Demo clinic", providerName: "Demo provider" }),
      }
    ));
    expect((await schedule("CL-1005")).status).toBe(400);
    expect((await schedule("CL-1001", "ref-1002")).status).toBe(400);
    const linked = await schedule("CL-1002", "ref-1002");
    expect(linked.status).toBe(201);
    expect(await linked.json()).toMatchObject({ caseId: "CL-1002", referralId: "ref-1002" });
  });
});
