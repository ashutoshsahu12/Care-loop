import type { ID1Database } from "../db/client";
import type { AdminAnalytics, AdminOverview, TimeSeriesPoint } from "../types/admin";

export class AnalyticsService {
  private db: ID1Database;

  constructor(db: ID1Database) {
    this.db = db;
  }

  async getOverview(): Promise<AdminOverview> {
    const totalPatientsRow = await this.db
      .prepare("SELECT COUNT(*) as count FROM patients")
      .first<{ count: number }>();

    const totalCasesRow = await this.db
      .prepare("SELECT COUNT(*) as count FROM cases")
      .first<{ count: number }>();

    const completedCasesRow = await this.db
      .prepare("SELECT COUNT(*) as count FROM cases WHERE status = 'completed'")
      .first<{ count: number }>();

    const overdueCasesRow = await this.db
      .prepare("SELECT COUNT(*) as count FROM cases WHERE status = 'overdue' OR (due_at < date('now') AND status != 'completed')")
      .first<{ count: number }>();

    const unassignedCasesRow = await this.db
      .prepare("SELECT COUNT(*) as count FROM cases WHERE status = 'unassigned' OR owner_id IS NULL")
      .first<{ count: number }>();

    const totalCases = Number(totalCasesRow?.count || 0);
    const completedCases = Number(completedCasesRow?.count || 0);
    const pendingCases = totalCases - completedCases;

    return {
      totalPatients: Number(totalPatientsRow?.count || 0),
      totalCases,
      pendingCases,
      completedCases,
      overdueCases: Number(overdueCasesRow?.count || 0),
      unassignedCases: Number(unassignedCasesRow?.count || 0),
      lastUpdated: new Date().toISOString(),
    };
  }

  async getAnalytics(): Promise<AdminAnalytics> {
    // Referral completion rate
    const refTotal = await this.db
      .prepare("SELECT COUNT(*) as count FROM referrals")
      .first<{ count: number }>();
    const refCompleted = await this.db
      .prepare("SELECT COUNT(*) as count FROM referrals WHERE status = 'completed'")
      .first<{ count: number }>();

    const totalRefs = Number(refTotal?.count || 0);
    const completedRefs = Number(refCompleted?.count || 0);
    const referralCompletionRate = totalRefs > 0 ? Number(((completedRefs / totalRefs) * 100).toFixed(1)) : 0;

    // Appointment attendance rate
    const aptAttended = await this.db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'attended'")
      .first<{ count: number }>();
    const aptRecorded = await this.db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE status IN ('attended', 'no_show')")
      .first<{ count: number }>();

    const attendedCount = Number(aptAttended?.count || 0);
    const recordedCount = Number(aptRecorded?.count || 0);
    const appointmentAttendanceRate =
      recordedCount > 0 ? Number(((attendedCount / recordedCount) * 100).toFixed(1)) : 0;

    // Notification acknowledgement rate
    const notifTotal = await this.db
      .prepare("SELECT COUNT(*) as count FROM notifications")
      .first<{ count: number }>();
    const notifAck = await this.db
      .prepare("SELECT COUNT(*) as count FROM notifications WHERE status = 'acknowledged'")
      .first<{ count: number }>();

    const totalNotifs = Number(notifTotal?.count || 0);
    const ackNotifs = Number(notifAck?.count || 0);
    const notificationAcknowledgementRate =
      totalNotifs > 0 ? Number(((ackNotifs / totalNotifs) * 100).toFixed(1)) : 0;

    // Verified closure rate
    const totalCasesRow = await this.db
      .prepare("SELECT COUNT(*) as count FROM cases")
      .first<{ count: number }>();
    const verifiedClosuresRow = await this.db
      .prepare("SELECT COUNT(*) as count FROM closure_records")
      .first<{ count: number }>();

    const totalCases = Number(totalCasesRow?.count || 0);
    const verifiedClosures = Number(verifiedClosuresRow?.count || 0);
    const verifiedClosureRate =
      totalCases > 0 ? Number(((verifiedClosures / totalCases) * 100).toFixed(1)) : 0;

    const completedCasesRow = await this.db
      .prepare("SELECT COUNT(*) as count FROM cases WHERE status = 'completed'")
      .first<{ count: number }>();
    const completedCases = Number(completedCasesRow?.count || 0);
    const unresolvedCases = totalCases - completedCases;

    // Calculate consultation turnaround from attended appointments with screening timestamps.
    const consultationRow = await this.db.prepare(
      `SELECT AVG((julianday(a.scheduled_time) - julianday(s.created_at)) * 24) as avgHours
       FROM appointments a
       JOIN cases c ON a.case_id = c.id
       JOIN screening_results s ON c.screening_result_id = s.id
       WHERE a.status = 'attended'
         AND julianday(a.scheduled_time) >= julianday(s.created_at)`
    ).first<{ avgHours: number | null }>();
    const averageTimeToConsultationHours = consultationRow?.avgHours == null
      ? 0 : Number(Number(consultationRow.avgHours).toFixed(1));

    // Dataset-backed chart points; no fabricated dates or outcomes.
    const referralRows = await this.db.prepare(
      `SELECT substr(updated_at, 1, 10) AS date, COUNT(*) AS value
       FROM referrals WHERE status = 'completed'
       GROUP BY substr(updated_at, 1, 10) ORDER BY date DESC LIMIT 7`
    ).all<TimeSeriesPoint>();
    const attendanceRows = await this.db.prepare(
      `SELECT substr(COALESCE(recorded_at, updated_at), 1, 10) AS date, COUNT(*) AS value
       FROM appointments WHERE status = 'attended'
       GROUP BY substr(COALESCE(recorded_at, updated_at), 1, 10)
       ORDER BY date DESC LIMIT 7`
    ).all<TimeSeriesPoint>();
    const referralCompletionTrend: TimeSeriesPoint[] = (referralRows.results || []).map(
      point => ({ date: point.date, value: Number(point.value) })
    ).reverse();
    const appointmentAttendanceTrend: TimeSeriesPoint[] = (attendanceRows.results || []).map(
      point => ({ date: point.date, value: Number(point.value) })
    ).reverse();

    return {
      referralCompletionRate,
      appointmentAttendanceRate,
      notificationAcknowledgementRate,
      averageTimeToConsultationHours,
      verifiedClosureRate,
      unresolvedCases,
      referralCompletionTrend,
      appointmentAttendanceTrend,
    };
  }
}
