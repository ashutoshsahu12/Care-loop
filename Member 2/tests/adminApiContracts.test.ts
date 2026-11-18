import { describe, it, expect, beforeEach } from "vitest";
import { getFreshRouter } from "./helpers/testDb";
import type { AppRouter } from "../src/routes/router";
import type {
  AdminAnalytics,
  AdminOverview,
  AtRiskCase,
  CaseRecord,
  EscalationRecord,
} from "../src/types/admin";

describe("Admin API Contracts (Member 3 Compatibility)", () => {
  let router: AppRouter;

  beforeEach(() => {
    const fresh = getFreshRouter();
    router = fresh.router;
  });

  it("GET /api/admin/overview returns valid AdminOverview structure", async () => {
    const res = await router.handle(new Request("http://localhost/api/admin/overview"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as AdminOverview;

    expect(typeof data.totalPatients).toBe("number");
    expect(typeof data.totalCases).toBe("number");
    expect(typeof data.pendingCases).toBe("number");
    expect(typeof data.completedCases).toBe("number");
    expect(typeof data.overdueCases).toBe("number");
    expect(typeof data.unassignedCases).toBe("number");
    expect(typeof data.lastUpdated).toBe("string");
    expect(data.totalCases).toBe(data.pendingCases + data.completedCases);
  });

  it("GET /api/admin/cases returns CaseRecord[] and respects filters", async () => {
    const res = await router.handle(new Request("http://localhost/api/admin/cases"));
    expect(res.status).toBe(200);
    const cases = (await res.json()) as CaseRecord[];

    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThan(0);

    const first = cases[0];
    expect(first.id).toBeDefined();
    expect(first.patientReference).toBeDefined();
    expect(first.status).toBeDefined();
    expect(first.nextAction).toBeDefined();
    expect(first.priority).toBeDefined();

    // Test status filter
    const screeningRes = await router.handle(new Request("http://localhost/api/admin/cases?status=screening"));
    const screeningCases = (await screeningRes.json()) as CaseRecord[];
    expect(screeningCases.every((c) => c.status === "screening")).toBe(true);

    // Test priority filter
    const highRes = await router.handle(new Request("http://localhost/api/admin/cases?priority=critical"));
    const highCases = (await highRes.json()) as CaseRecord[];
    expect(highCases.every((c) => c.priority === "critical")).toBe(true);

    // Test search filter
    const searchRes = await router.handle(new Request("http://localhost/api/admin/cases?search=Kavita"));
    const searchCases = (await searchRes.json()) as CaseRecord[];
    expect(searchCases.length).toBeGreaterThan(0);
    expect(searchCases[0].patientReference).toBe("CL-P-1001");
  });

  it("GET /api/admin/escalations returns EscalationRecord[] matching Member 3 shape", async () => {
    const res = await router.handle(new Request("http://localhost/api/admin/escalations"));
    expect(res.status).toBe(200);
    const escalations = (await res.json()) as EscalationRecord[];

    expect(Array.isArray(escalations)).toBe(true);
    for (const item of escalations) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.caseId).toBe("string");
      expect(typeof item.patientReference).toBe("string");
      expect(typeof item.type).toBe("string");
      expect(typeof item.reason).toBe("string");
      expect(typeof item.overdueDays).toBe("number");
      expect(typeof item.priority).toBe("string");
    }
  });

  it("GET /api/admin/at-risk returns AtRiskCase[] matching Member 3 shape", async () => {
    const res = await router.handle(new Request("http://localhost/api/admin/at-risk"));
    expect(res.status).toBe(200);
    const atRisk = (await res.json()) as AtRiskCase[];

    expect(Array.isArray(atRisk)).toBe(true);
    for (const item of atRisk) {
      expect(typeof item.caseId).toBe("string");
      expect(typeof item.patientReference).toBe("string");
      expect(Array.isArray(item.reasons)).toBe(true);
      expect(typeof item.overdueDays).toBe("number");
      expect(typeof item.suggestedNextAction).toBe("string");
      expect(typeof item.riskLevel).toBe("string");
    }
  });

  it("GET /api/admin/analytics returns AdminAnalytics with trend arrays", async () => {
    const res = await router.handle(new Request("http://localhost/api/admin/analytics"));
    expect(res.status).toBe(200);
    const analytics = (await res.json()) as AdminAnalytics;

    expect(typeof analytics.referralCompletionRate).toBe("number");
    expect(typeof analytics.appointmentAttendanceRate).toBe("number");
    expect(typeof analytics.notificationAcknowledgementRate).toBe("number");
    expect(typeof analytics.averageTimeToConsultationHours).toBe("number");
    expect(typeof analytics.verifiedClosureRate).toBe("number");
    expect(typeof analytics.unresolvedCases).toBe("number");
    expect(Array.isArray(analytics.referralCompletionTrend)).toBe(true);
    expect(Array.isArray(analytics.appointmentAttendanceTrend)).toBe(true);
  });
});
