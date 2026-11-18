import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import type { AppRouter } from "../src/routes/router";
import type { ID1Database } from "../src/db/client";

describe("Verified Case Closure Safety Rules", () => {
  let router: AppRouter;
  let db: ID1Database;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
    db = fresh.db;
  });

  it("blocks care workers from closing a case", async () => {
    const req = new Request("http://localhost/api/cases/CL-1004/close", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "care_worker",
        "x-user-id": "usr-cw-4",
      },
      body: JSON.stringify({
        outcome: "care_completed",
        evidenceNote: "Care completed by care worker home visit.",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.message).toMatch(/Forbidden/);
  });

  it("rejects closure without a sufficient evidence note (min 10 characters)", async () => {
    const req = new Request("http://localhost/api/cases/CL-1004/close", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "clinician",
        "x-user-id": "usr-clin-1",
      },
      body: JSON.stringify({
        outcome: "care_completed",
        evidenceNote: "Done",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.message).toMatch(/Validation Error/);
  });

  it("executes verified case closure when authorized clinician provides evidence note and outcome", async () => {
    const req = new Request("http://localhost/api/cases/CL-1004/close", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "clinician",
        "x-user-id": "usr-clin-1",
      },
      body: JSON.stringify({
        outcome: "treatment_plan_established",
        evidenceNote: "Patient received cardiology evaluation at secondary center; medication regimen adjusted with follow-up scheduled.",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;

    expect(result.closureRecord).toBeDefined();
    expect(result.closureRecord.outcome).toBe("treatment_plan_established");
    expect(result.closureRecord.verificationActorRole).toBe("clinician");
    expect(result.careCase.status).toBe("completed");

    // Case in DB is now completed
    const caseRow = await db
      .prepare("SELECT status FROM cases WHERE id = 'CL-1004'")
      .first<{ status: string }>();
    expect(caseRow?.status).toBe("completed");

    // Closure record exists in closure_records table
    const closureRow = await db
      .prepare("SELECT * FROM closure_records WHERE case_id = 'CL-1004'")
      .first<any>();
    expect(closureRow).toBeDefined();
    expect(closureRow.outcome).toBe("treatment_plan_established");

    // Case event recorded
    const event = await db
      .prepare(
        "SELECT event_type, summary FROM case_events WHERE case_id = 'CL-1004' AND event_type = 'verified_closure'"
      )
      .first<any>();
    expect(event).toBeDefined();
  });

  it("proves referral creation or appointment attendance alone does not close a case", async () => {
    // CL-1002 has a referral created, yet status is 'referred', NOT 'completed'
    const caseRow = await db
      .prepare("SELECT status FROM cases WHERE id = 'CL-1002'")
      .first<{ status: string }>();
    expect(caseRow?.status).toBe("referred");

    // Standard status update directly to 'completed' is blocked
    const directReq = new Request("http://localhost/api/cases/CL-1002/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "clinician",
      },
      body: JSON.stringify({
        targetStatus: "completed",
      }),
    });

    const directRes = await router.handle(directReq);
    expect(directRes.status).toBe(400);
    const body = (await directRes.json()) as any;
    expect(body.message).toMatch(/verified case closure workflow/);
  });
});
