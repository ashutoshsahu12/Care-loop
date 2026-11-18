import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import { evaluateScreeningTriage } from "../src/rules/triageRules";
import type { AppRouter } from "../src/routes/router";
import type { ID1Database } from "../src/db/client";

describe("Screening Submission and Case Creation", () => {
  let router: AppRouter;
  let db: ID1Database;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
    db = fresh.db;
  });

  it("evaluates deterministic triage rules correctly", () => {
    // Critical: BP crisis
    const critical = evaluateScreeningTriage("cardiovascular", "Hypertensive crisis: 190/120 mmHg", "critical", 190);
    expect(critical.priority).toBe("critical");
    expect(critical.requiresClinicalReview).toBe(true);
    expect(critical.nextAction).toMatch(/Urgent clinical review/);

    // High: Stage 2 Hypertension
    const high = evaluateScreeningTriage("cardiovascular", "Stage 2 Hypertension: 160/100 mmHg", "urgent", 160);
    expect(high.priority).toBe("high");
    expect(high.requiresClinicalReview).toBe(true);

    // Medium: Stage 1 / Elevated
    const medium = evaluateScreeningTriage("cardiovascular", "Elevated Blood Pressure: 135/88 mmHg", "routine", 135);
    expect(medium.priority).toBe("medium");

    // Low: Normal
    const low = evaluateScreeningTriage("cardiovascular", "Normal: 118/76 mmHg", "routine", 118);
    expect(low.priority).toBe("low");
  });

  it("submits screening result and auto-creates a case with audit events", async () => {
    const req = new Request("http://localhost/api/screenings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-cw-1",
      },
      body: JSON.stringify({
        patientId: "pat-1001",
        screeningType: "cardiovascular",
        resultValue: "Severe systolic reading: 184/110 mmHg",
        score: 184,
        urgency: "critical",
        assignedCareWorkerId: "usr-cw-1",
        rawPayload: { systolic: 184, diastolic: 110 },
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;

    expect(body.careCase).toBeDefined();
    expect(body.screeningResult).toBeDefined();

    const createdCase = body.careCase;
    expect(createdCase.id).toMatch(/^CL-/);
    expect(createdCase.priority).toBe("critical");
    expect(createdCase.status).toBe("screening");
    expect(createdCase.dueAt).toBeDefined();
    expect(createdCase.nextAction).toBeDefined();
    expect(createdCase.ownerId).toBe("usr-cw-1");

    // Check that immutable case event was recorded
    const eventRes = await db
      .prepare("SELECT * FROM case_events WHERE case_id = ? AND event_type = 'case_created'")
      .bind(createdCase.id)
      .first<any>();
    expect(eventRes).toBeDefined();
    expect(eventRes.case_id).toBe(createdCase.id);

    // Check that patient notification was created
    const notifRes = await db
      .prepare("SELECT * FROM notifications WHERE case_id = ?")
      .bind(createdCase.id)
      .first<any>();
    expect(notifRes).toBeDefined();
    expect(notifRes.type).toBe("screening_result");
  });

  it("creates unassigned case when no owner is provided", async () => {
    const req = new Request("http://localhost/api/screenings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr-cw-2",
      },
      body: JSON.stringify({
        patientId: "pat-1002",
        screeningType: "diabetic_retinopathy",
        resultValue: "Suspected moderate non-proliferative retinopathy",
        score: 2,
        urgency: "urgent",
      }),
    });

    const res = await router.handle(req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;

    expect(body.careCase.status).toBe("unassigned");
    expect(body.careCase.ownerId).toBeNull();
    expect(body.careCase.dueAt).toBeDefined();
    expect(body.careCase.nextAction).toBeDefined();
  });
});
