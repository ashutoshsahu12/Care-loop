import type { ID1Database } from "../db/client";
import type { AtRiskCase, EscalationRecord } from "../types/admin";
import { detectCaseEscalations } from "../rules/escalationRules";

export class EscalationService {
  private db: ID1Database;

  constructor(db: ID1Database) {
    this.db = db;
  }

  async getEscalations(now: Date = new Date()): Promise<EscalationRecord[]> {
    const { escalations } = await this.evaluateAllCases(now);
    return escalations;
  }

  async getAtRiskCases(now: Date = new Date()): Promise<AtRiskCase[]> {
    const { atRiskCases } = await this.evaluateAllCases(now);
    return atRiskCases;
  }

  private async evaluateAllCases(now: Date): Promise<{
    escalations: EscalationRecord[];
    atRiskCases: AtRiskCase[];
  }> {
    interface DbCaseRow {
      id: string;
      patientReference: string;
      status: string;
      priority: "low" | "medium" | "high" | "critical";
      assignedCareWorker: string | null;
      dueAt: string;
      lastActivityAt: string;
    }

    const casesRes = await this.db
      .prepare(
        `SELECT c.id, p.patient_reference as patientReference, c.status, c.priority,
                c.assigned_care_worker_name as assignedCareWorker,
                c.due_at as dueAt, c.last_activity_at as lastActivityAt
         FROM cases c
         JOIN patients p ON c.patient_id = p.id
         WHERE c.status != 'completed'`
      )
      .all<DbCaseRow>();

    const cases = casesRes.results || [];
    const allEscalations: EscalationRecord[] = [];
    const allAtRisk: AtRiskCase[] = [];

    for (const c of cases) {
      // Get referrals
      const refRes = await this.db
        .prepare("SELECT id, status, created_at as createdAt FROM referrals WHERE case_id = ?")
        .bind(c.id)
        .all<{ id: string; status: string; createdAt: string }>();

      // Get appointments
      const aptRes = await this.db
        .prepare(
          "SELECT id, status, scheduled_time as scheduledTime, updated_at as updatedAt FROM appointments WHERE case_id = ? ORDER BY scheduled_time ASC"
        )
        .bind(c.id)
        .all<{ id: string; status: string; scheduledTime: string; updatedAt: string }>();

      // Get notifications
      const notifRes = await this.db
        .prepare(
          "SELECT id, status, created_at as createdAt, acknowledged_at as acknowledgedAt FROM notifications WHERE case_id = ?"
        )
        .bind(c.id)
        .all<{ id: string; status: string; createdAt: string; acknowledgedAt: string | null }>();

      const { escalations, atRisk } = detectCaseEscalations(
        {
          caseId: c.id,
          patientReference: c.patientReference,
          status: c.status,
          priority: c.priority,
          assignedCareWorker: c.assignedCareWorker,
          dueAt: c.dueAt,
          lastActivityAt: c.lastActivityAt,
          referrals: refRes.results || [],
          appointments: aptRes.results || [],
          notifications: notifRes.results || [],
        },
        now
      );

      allEscalations.push(...escalations);
      if (atRisk) {
        allAtRisk.push(atRisk);
      }
    }

    return {
      escalations: allEscalations,
      atRiskCases: allAtRisk,
    };
  }
}
