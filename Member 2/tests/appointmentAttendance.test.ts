import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import type { AppRouter } from "../src/routes/router";
import type { ID1Database } from "../src/db/client";

describe("Appointments and Attendance Recording", () => {
  let router: AppRouter;
  let db: ID1Database;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
    db = fresh.db;
  });

  it("schedules an appointment and transitions case to appointment_scheduled", async () => {
    const req = new Request("http://localhost/api/cases/CL-1001/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-cw-1",
      },
      body: JSON.stringify({
        scheduledTime: "2026-11-25T10:00:00Z",
        facility: "City Health Clinic",
        providerName: "Dr. Neha Verma",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(201);
    const apt = (await res.json()) as any;
    expect(apt.id).toMatch(/^apt-/);
    expect(apt.status).toBe("scheduled");

    const caseRow = await db
      .prepare("SELECT status, next_action FROM cases WHERE id = 'CL-1001'")
      .first<{ status: string; next_action: string }>();
    expect(caseRow?.status).toBe("appointment_scheduled");
    expect(caseRow?.next_action).toContain("2026-11-25");
  });

  it("records attendance as attended and transitions case to in_care", async () => {
    const req = new Request("http://localhost/api/appointments/apt-1003/attendance", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-cw-3",
      },
      body: JSON.stringify({
        status: "attended",
        attendanceNotes: "Patient attended on time. Comprehensive fundus examination completed.",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(200);
    const updated = (await res.json()) as any;
    expect(updated.status).toBe("attended");

    const caseRow = await db
      .prepare("SELECT status, next_action FROM cases WHERE id = 'CL-1003'")
      .first<{ status: string; next_action: string }>();
    expect(caseRow?.status).toBe("in_care");
    expect(caseRow?.next_action).toMatch(/Record clinical follow-up/);

    const event = await db
      .prepare(
        "SELECT event_type, summary FROM case_events WHERE case_id = 'CL-1003' AND event_type = 'attendance_recorded'"
      )
      .first<any>();
    expect(event).toBeDefined();
    expect(event.summary).toContain("attended");
  });

  it("records attendance as no_show and sets overdue follow-up action", async () => {
    const req = new Request("http://localhost/api/appointments/apt-1012/attendance", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-cw-2",
      },
      body: JSON.stringify({
        status: "no_show",
        attendanceNotes: "Patient was unable to arrange childcare.",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(200);

    const caseRow = await db
      .prepare("SELECT status, next_action FROM cases WHERE id = 'CL-1012'")
      .first<{ status: string; next_action: string }>();
    expect(caseRow?.status).toBe("overdue");
    expect(caseRow?.next_action).toMatch(/Contact patient to reschedule/);
  });
});
