import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import type { AppRouter } from "../src/routes/router";
import type { ID1Database } from "../src/db/client";

describe("Follow-Up Task Management", () => {
  let router: AppRouter;
  let db: ID1Database;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
    db = fresh.db;
  });

  it("creates a follow-up task and logs audit event", async () => {
    const req = new Request("http://localhost/api/cases/CL-1001/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-cw-1",
      },
      body: JSON.stringify({
        assignedToId: "usr-cw-1",
        title: "Call patient to confirm low-sodium compliance",
        description: "Verify whether patient picked up prescribed ACE inhibitor",
        dueDate: "2026-11-21",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(201);
    const task = (await res.json()) as any;
    expect(task.id).toMatch(/^tsk-/);
    expect(task.title).toContain("low-sodium");
    expect(task.status).toBe("pending");

    const event = await db
      .prepare(
        "SELECT event_type FROM case_events WHERE case_id = 'CL-1001' AND event_type = 'follow_up_task_created'"
      )
      .first<any>();
    expect(event).toBeDefined();
  });

  it("updates task to completed and logs completion event", async () => {
    const req = new Request("http://localhost/api/tasks/tsk-1001", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-cw-1",
      },
      body: JSON.stringify({
        status: "completed",
        description: "Dietary log reviewed, patient reports feeling well.",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(200);
    const updated = (await res.json()) as any;
    expect(updated.status).toBe("completed");
    expect(updated.completedAt).toBeDefined();

    const event = await db
      .prepare(
        "SELECT event_type FROM case_events WHERE case_id = 'CL-1001' AND event_type = 'follow_up_task_completed'"
      )
      .first<any>();
    expect(event).toBeDefined();
  });
});
