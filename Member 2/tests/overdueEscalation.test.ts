import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import { EscalationService } from "../src/services/escalationService";
import type { AppRouter } from "../src/routes/router";
import type { ID1Database } from "../src/db/client";

describe("Due-Date, Overdue Detection & Escalation Engine", () => {
  let router: AppRouter;
  let db: ID1Database;
  let escalationService: EscalationService;
  const mockNow = new Date("2026-11-18T12:00:00Z");

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
    db = fresh.db;
    escalationService = new EscalationService(db);
  });

  it("detects overdue referrals, missed appointments, and unassigned active cases", async () => {
    const escalations = await escalationService.getEscalations(mockNow);
    expect(escalations.length).toBeGreaterThan(0);

    const types = escalations.map((e) => e.type);
    expect(types).toContain("overdue_referral");
    expect(types).toContain("missed_appointment");
    expect(types).toContain("unassigned_case");

    // Check specific escalation fields
    const missedApt = escalations.find((e) => e.type === "missed_appointment");
    expect(missedApt).toBeDefined();
    expect(missedApt?.caseId).toBe("CL-1004");
    expect(missedApt?.reason).toMatch(/Scheduled consultation was missed/);
    expect(missedApt?.overdueDays).toBeGreaterThan(0);
  });

  it("evaluates lost-to-follow-up at-risk cases with deterministic reasons and suggested actions", async () => {
    const atRiskCases = await escalationService.getAtRiskCases(mockNow);
    expect(atRiskCases.length).toBeGreaterThan(0);

    const cl1006 = atRiskCases.find((c) => c.caseId === "CL-1006");
    expect(cl1006).toBeDefined();
    expect(cl1006?.reasons).toContain("pending_referral");
    expect(cl1006?.riskLevel).toBe("critical");
    expect(cl1006?.suggestedNextAction).toMatch(/Call the referral centre/);

    const cl1004 = atRiskCases.find((c) => c.caseId === "CL-1004");
    expect(cl1004).toBeDefined();
    expect(cl1004?.reasons).toContain("missed_appointment");
    expect(cl1004?.suggestedNextAction).toMatch(/Contact the patient and reschedule/);
  });

  it("serves escalation and at-risk endpoints via HTTP API", async () => {
    const escRes = await router.handle(new Request("http://localhost/api/admin/escalations"));
    expect(escRes.status).toBe(200);
    const escalations = (await escRes.json()) as any[];
    expect(Array.isArray(escalations)).toBe(true);

    const atRiskRes = await router.handle(new Request("http://localhost/api/admin/at-risk"));
    expect(atRiskRes.status).toBe(200);
    const atRisk = (await atRiskRes.json()) as any[];
    expect(Array.isArray(atRisk)).toBe(true);
  });
});
