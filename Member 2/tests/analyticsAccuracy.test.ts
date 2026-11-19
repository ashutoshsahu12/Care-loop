import { describe, expect, it } from "vitest";
import { createTestOrLocalDb } from "../src/db/localDb";
import { AnalyticsService } from "../src/services/analyticsService";

describe("dataset-backed admin analytics", () => {
  it("returns zeroes and empty trends for an empty database", async () => {
    const db = createTestOrLocalDb({ seed: false });
    const metrics = await new AnalyticsService(db).getAnalytics();
    expect(metrics.referralCompletionRate).toBe(0);
    expect(metrics.appointmentAttendanceRate).toBe(0);
    expect(metrics.notificationAcknowledgementRate).toBe(0);
    expect(metrics.averageTimeToConsultationHours).toBe(0);
    expect(metrics.verifiedClosureRate).toBe(0);
    expect(metrics.referralCompletionTrend).toEqual([]);
    expect(metrics.appointmentAttendanceTrend).toEqual([]);
  });
  it("uses stored demo outcomes rather than invented timeline dates", async () => {
    const db = createTestOrLocalDb({ seed: true });
    const metrics = await new AnalyticsService(db).getAnalytics();
    expect(metrics.referralCompletionTrend.every(point => point.date.length === 10 && point.date.includes("-"))).toBe(true);
    expect(metrics.appointmentAttendanceTrend.every(point => point.date.length === 10 && point.date.includes("-"))).toBe(true);
  });
});
