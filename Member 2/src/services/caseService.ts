import type { ID1Database } from "../db/client";
import type { CareCase, ClosureRecord, Patient, ScreeningResult } from "../types/domain";
import type { AtRiskCase, CaseFilters, CaseRecord, CaseStatus, EscalationRecord, Priority } from "../types/admin";
import type {
  PatientAppointmentView,
  PatientCareJourneyStep,
  PatientCaseView,
  PatientNotificationView,
  PatientPortalSummary,
  PatientProfile,
} from "../types/patient";
import type { User } from "../types/auth";
import type {
  CaseAssignmentInput,
  ScreeningSubmissionInput,
  VerifiedClosureInput,
} from "../validation/schemas";
import { TimelineService } from "./timelineService";
import { NotificationService } from "./notificationService";
import { evaluateScreeningTriage } from "../rules/triageRules";
import { canTransitionStatus } from "../rules/stateMachine";
import { validateCaseClosure } from "../rules/closureRules";
import { detectCaseEscalations } from "../rules/escalationRules";

/** Unique synthetic-case identifier, compatible with both Node 22 and Cloudflare Workers.
 * Keeps readable seeded CL-1001 examples untouched while avoiding four-digit ID collisions.
 */
export function createCareCaseId(): string {
  return `CL-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export class CaseService {
  private db: ID1Database;
  private timeline: TimelineService;
  private notifications: NotificationService;

  constructor(db: ID1Database, timeline?: TimelineService, notifications?: NotificationService) {
    this.db = db;
    this.timeline = timeline ?? new TimelineService(db);
    this.notifications = notifications ?? new NotificationService(db, this.timeline);
  }

  async submitScreeningAndCreateCase(
    input: ScreeningSubmissionInput,
    actor: User
  ): Promise<{ careCase: CareCase; screeningResult: ScreeningResult }> {
    const now = new Date().toISOString();

    // Verify or find patient
    const patient = await this.db
      .prepare("SELECT id, patient_reference FROM patients WHERE id = ? OR patient_reference = ?")
      .bind(input.patientId, input.patientId)
      .first<{ id: string; patient_reference: string }>();

    if (!patient) {
      throw new Error(`Patient '${input.patientId}' not found.`);
    }

    // Evaluate deterministic clinical triage rules
    const triage = evaluateScreeningTriage(
      input.screeningType,
      input.resultValue,
      input.urgency,
      input.score
    );

    const screeningId = `scr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const payloadStr = input.rawPayload ? JSON.stringify(input.rawPayload) : null;
    const screeningStatus = triage.requiresClinicalReview ? "escalated" : "pending_review";

    await this.db
      .prepare(
        `INSERT INTO screening_results
        (id, patient_id, screening_type, result_value, score, urgency, status, raw_payload, clinician_notes, submitted_by_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        screeningId,
        patient.id,
        input.screeningType,
        input.resultValue,
        input.score ?? null,
        triage.urgency,
        screeningStatus,
        payloadStr,
        input.clinicianNotes ?? null,
        actor.id,
        now
      )
      .run();

    // Create case
    const caseId = createCareCaseId();
    const hasOwner = Boolean(input.assignedCareWorkerId);
    const initialStatus: CaseStatus = hasOwner ? "screening" : "unassigned";

    let assignedWorkerName = input.assignedCareWorkerName ?? null;
    if (input.assignedCareWorkerId && !assignedWorkerName) {
      const worker = await this.db
        .prepare("SELECT name FROM users WHERE id = ?")
        .bind(input.assignedCareWorkerId)
        .first<{ name: string }>();
      if (worker) assignedWorkerName = worker.name;
    }

    await this.db
      .prepare(
        `INSERT INTO cases
        (id, patient_id, screening_result_id, status, priority, owner_id, assigned_care_worker_name, next_action, due_at, last_activity_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        caseId,
        patient.id,
        screeningId,
        initialStatus,
        triage.priority,
        input.assignedCareWorkerId ?? null,
        assignedWorkerName,
        triage.nextAction,
        triage.dueAt,
        now,
        now,
        now
      )
      .run();

    // Record immutable audit event
    await this.timeline.recordCaseEvent({
      caseId,
      actorId: actor.id,
      actorRole: actor.role,
      eventType: "case_created",
      fromStatus: null,
      toStatus: initialStatus,
      summary: `Case initiated from ${input.screeningType} screening. Priority: ${triage.priority}`,
      metadata: {
        screeningId,
        triageExplanation: triage.ruleExplanation,
        requiresClinicalReview: triage.requiresClinicalReview,
        dueAt: triage.dueAt,
      },
      createdAt: now,
    });

    if (hasOwner) {
      await this.timeline.recordCaseEvent({
        caseId,
        actorId: actor.id,
        actorRole: actor.role,
        eventType: "case_assigned",
        fromStatus: initialStatus,
        toStatus: initialStatus,
        summary: `Assigned initial case owner: ${assignedWorkerName ?? input.assignedCareWorkerId}`,
        metadata: {
          ownerId: input.assignedCareWorkerId,
          ownerName: assignedWorkerName,
        },
        createdAt: now,
      });
    }

    // Auto-create notification for patient
    await this.notifications.createNotification({
      caseId,
      recipientId: patient.id,
      recipientRole: "patient",
      type: "screening_result",
      title: "Screening Summary Available",
      message: `Your ${input.screeningType} screening has been processed and assigned to care coordination.`,
    });

    const careCase: CareCase = {
      id: caseId,
      patientId: patient.id,
      screeningResultId: screeningId,
      status: initialStatus,
      priority: triage.priority,
      ownerId: input.assignedCareWorkerId ?? null,
      assignedCareWorkerName: assignedWorkerName,
      nextAction: triage.nextAction,
      dueAt: triage.dueAt,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const screeningResult: ScreeningResult = {
      id: screeningId,
      patientId: patient.id,
      screeningType: input.screeningType,
      resultValue: input.resultValue,
      score: input.score ?? null,
      urgency: triage.urgency,
      status: screeningStatus,
      rawPayload: input.rawPayload ?? null,
      clinicianNotes: input.clinicianNotes ?? null,
      submittedById: actor.id,
      createdAt: now,
    };

    return { careCase, screeningResult };
  }

  async getCases(filters: CaseFilters = {}): Promise<CaseRecord[]> {
    let query = `
      SELECT c.id, p.patient_reference as patientReference, c.status,
             c.assigned_care_worker_name as assignedCareWorker,
             c.next_action as nextAction, c.due_at as dueDate,
             c.last_activity_at as lastActivityAt, c.priority
      FROM cases c
      JOIN patients p ON c.patient_id = p.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (filters.status && filters.status !== "all") {
      query += " AND c.status = ?";
      params.push(filters.status);
    }

    if (filters.priority && filters.priority !== "all") {
      query += " AND c.priority = ?";
      params.push(filters.priority);
    }

    if (filters.assignedCareWorker && filters.assignedCareWorker !== "all") {
      if (filters.assignedCareWorker === "unassigned") {
        query += " AND c.owner_id IS NULL";
      } else {
        query += " AND c.assigned_care_worker_name = ?";
        params.push(filters.assignedCareWorker);
      }
    }

    if (filters.search && filters.search.trim()) {
      const s = `%${filters.search.trim()}%`;
      query += ` AND (
        c.id LIKE ? OR 
        p.patient_reference LIKE ? OR 
        p.name LIKE ? OR 
        c.next_action LIKE ? OR 
        c.assigned_care_worker_name LIKE ? OR
        c.status LIKE ?
      )`;
      params.push(s, s, s, s, s, s);
    }

    query += " ORDER BY c.created_at DESC";

    const res = await this.db.prepare(query).bind(...params).all<CaseRecord>();
    return res.results || [];
  }

  async getCaseDetails(caseId: string): Promise<{
    caseRecord: CareCase & { patientReference: string; patientName: string };
    patient: Patient;
    screeningResult: ScreeningResult | null;
    closureRecord: ClosureRecord | null;
    escalations: EscalationRecord[];
    atRisk: AtRiskCase | null;
  }> {
    const rawCase = await this.db
      .prepare(
        `SELECT c.id, c.patient_id as patientId, c.screening_result_id as screeningResultId,
                c.status, c.priority, c.owner_id as ownerId,
                c.assigned_care_worker_name as assignedCareWorkerName,
                c.next_action as nextAction, c.due_at as dueAt,
                c.last_activity_at as lastActivityAt, c.created_at as createdAt, c.updated_at as updatedAt,
                p.patient_reference as patientReference, p.name as patientName
         FROM cases c
         JOIN patients p ON c.patient_id = p.id
         WHERE c.id = ?`
      )
      .bind(caseId)
      .first<CareCase & { patientReference: string; patientName: string }>();

    if (!rawCase) {
      throw new Error(`Case '${caseId}' not found`);
    }

    const patient = await this.db
      .prepare(
        `SELECT id, patient_reference as patientReference, name, date_of_birth as dateOfBirth,
                gender, phone, email, address, created_at as createdAt, updated_at as updatedAt
         FROM patients WHERE id = ?`
      )
      .bind(rawCase.patientId)
      .first<Patient>();

    if (!patient) {
      throw new Error(`Patient not found for case '${caseId}'`);
    }

    let screeningResult: ScreeningResult | null = null;
    if (rawCase.screeningResultId) {
      const scr = await this.db
        .prepare(
          `SELECT id, patient_id as patientId, screening_type as screeningType,
                  result_value as resultValue, score, urgency, status,
                  raw_payload as rawPayloadStr, clinician_notes as clinicianNotes,
                  submitted_by_id as submittedById, created_at as createdAt
           FROM screening_results WHERE id = ?`
        )
        .bind(rawCase.screeningResultId)
        .first<{
          id: string;
          patientId: string;
          screeningType: string;
          resultValue: string;
          score: number | null;
          urgency: "routine" | "urgent" | "critical";
          status: "pending_review" | "reviewed" | "escalated";
          rawPayloadStr: string | null;
          clinicianNotes: string | null;
          submittedById: string | null;
          createdAt: string;
        }>();

      if (scr) {
        screeningResult = {
          ...scr,
          rawPayload: scr.rawPayloadStr ? JSON.parse(scr.rawPayloadStr) : null,
        };
      }
    }

    const closureRecord = await this.db
      .prepare(
        `SELECT id, case_id as caseId, outcome, verification_actor_id as verificationActorId,
                verification_actor_role as verificationActorRole, evidence_note as evidenceNote,
                verified_at as verifiedAt, created_at as createdAt
         FROM closure_records WHERE case_id = ?`
      )
      .bind(caseId)
      .first<ClosureRecord>();

    // Evaluate active escalations and follow-up risk for this specific case
    const refRes = await this.db
      .prepare("SELECT id, status, created_at as createdAt FROM referrals WHERE case_id = ?")
      .bind(caseId)
      .all<{ id: string; status: string; createdAt: string }>();

    const aptRes = await this.db
      .prepare(
        "SELECT id, status, scheduled_time as scheduledTime, updated_at as updatedAt FROM appointments WHERE case_id = ? ORDER BY scheduled_time ASC"
      )
      .bind(caseId)
      .all<{ id: string; status: string; scheduledTime: string; updatedAt: string }>();

    const notifRes = await this.db
      .prepare(
        "SELECT id, status, created_at as createdAt, acknowledged_at as acknowledgedAt FROM notifications WHERE case_id = ?"
      )
      .bind(caseId)
      .all<{ id: string; status: string; createdAt: string; acknowledgedAt: string | null }>();

    const { escalations, atRisk } = detectCaseEscalations({
      caseId: rawCase.id,
      patientReference: rawCase.patientReference,
      status: rawCase.status,
      priority: rawCase.priority,
      assignedCareWorker: rawCase.assignedCareWorkerName,
      dueAt: rawCase.dueAt,
      lastActivityAt: rawCase.lastActivityAt,
      referrals: refRes.results || [],
      appointments: aptRes.results || [],
      notifications: notifRes.results || [],
    });

    return {
      caseRecord: rawCase,
      patient,
      screeningResult,
      closureRecord: closureRecord ?? null,
      escalations,
      atRisk,
    };
  }

  async getPatientPortalSummary(patientIdOrRef: string): Promise<PatientPortalSummary> {
    const patient = await this.db
      .prepare(
        `SELECT id, patient_reference as patientReference, name, date_of_birth as dateOfBirth,
                gender, phone, email, address
         FROM patients WHERE id = ? OR patient_reference = ?`
      )
      .bind(patientIdOrRef, patientIdOrRef)
      .first<PatientProfile>();

    if (!patient) {
      throw new Error(`Patient '${patientIdOrRef}' not found`);
    }

    // Get latest active case for this patient
    const caseRow = await this.db
      .prepare(
        `SELECT c.id, c.patient_id as patientId, c.status, c.priority,
                c.assigned_care_worker_name as assignedCareWorker,
                c.next_action as nextAction, c.due_at as dueAt,
                s.screening_type as screeningType, s.result_value as resultValue
         FROM cases c
         LEFT JOIN screening_results s ON c.screening_result_id = s.id
         WHERE c.patient_id = ?
         ORDER BY c.created_at DESC LIMIT 1`
      )
      .bind(patient.id)
      .first<{
        id: string;
        patientId: string;
        status: CaseStatus;
        priority: Priority;
        assignedCareWorker: string | null;
        nextAction: string;
        dueAt: string;
        screeningType: string | null;
        resultValue: string | null;
      }>();

    let activeCase: PatientCaseView | null = null;
    if (caseRow) {
      const statusMap: Record<CaseStatus, string> = {
        screening: "Screening Under Review",
        referred: "Specialist Referral Initiated",
        appointment_scheduled: "Consultation Scheduled",
        in_care: "Care & Follow-Up in Progress",
        completed: "Care Completed & Verified",
        overdue: "Action Required / Needs Follow-up",
        unassigned: "Care Worker Assignment Pending",
      };

      const journeySteps: PatientCareJourneyStep[] = [
        {
          key: "screening",
          title: "Screening Completed",
          description: "Health screening performed and registered in CARELOOP.",
          completed: true,
          active: caseRow.status === "screening",
        },
        {
          key: "referred",
          title: "Specialist Referral",
          description: "Care team connecting with clinic specialist.",
          completed: ["referred", "appointment_scheduled", "in_care", "completed"].includes(caseRow.status),
          active: caseRow.status === "referred",
        },
        {
          key: "appointment",
          title: "Clinic Consultation",
          description: "Specialist consultation and clinical diagnostic review.",
          completed: ["in_care", "completed"].includes(caseRow.status),
          active: caseRow.status === "appointment_scheduled",
        },
        {
          key: "closure",
          title: "Verified Loop Closure",
          description: "Treatment plan established and care verified complete.",
          completed: caseRow.status === "completed",
          active: caseRow.status === "in_care",
        },
      ];

      activeCase = {
        id: caseRow.id,
        patientReference: patient.patientReference,
        status: caseRow.status,
        statusDisplay: statusMap[caseRow.status] || caseRow.status,
        priority: caseRow.priority,
        screeningType: caseRow.screeningType ?? "General Health Screening",
        screeningSummary: caseRow.resultValue ? `Screening registered: ${caseRow.resultValue}` : "Routine health screening recorded.",
        nextStep: caseRow.nextAction,
        targetDate: caseRow.dueAt,
        journeySteps,
        assignedCareWorker: caseRow.assignedCareWorker,
      };
    }

    // Get upcoming appointments
    const aptRes = await this.db
      .prepare(
        `SELECT a.id, a.case_id as caseId, a.scheduled_time as scheduledTime,
                a.facility, a.provider_name as providerName, a.status
         FROM appointments a
         JOIN cases c ON a.case_id = c.id
         WHERE c.patient_id = ?
         ORDER BY a.scheduled_time ASC`
      )
      .bind(patient.id)
      .all<PatientAppointmentView>();

    // Get notifications
    const notifRes = await this.db
      .prepare(
        `SELECT id, case_id as caseId, type, title, message, status,
                created_at as createdAt, acknowledged_at as acknowledgedAt
         FROM notifications
         WHERE recipient_role = 'patient'
           AND (recipient_id = ?
             OR recipient_id = ?
             OR recipient_id IN (SELECT id FROM users WHERE email = ?))
         ORDER BY created_at DESC`
      )
      .bind(patient.id, patient.patientReference, patient.email ?? "")
      .all<PatientNotificationView>();

    return {
      patient,
      activeCase,
      upcomingAppointments: aptRes.results || [],
      unreadNotifications: notifRes.results || [],
    };
  }

  async assignCase(caseId: string, input: CaseAssignmentInput, actor: User): Promise<CareCase> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT * FROM cases WHERE id = ?")
      .bind(caseId)
      .first<{
        id: string;
        patient_id: string;
        status: CaseStatus;
        owner_id: string | null;
        assigned_care_worker_name: string | null;
        next_action: string;
        due_at: string;
        priority: Priority;
        created_at: string;
        updated_at: string;
      }>();

    if (!existing) {
      throw new Error(`Case '${caseId}' not found`);
    }

    let newOwnerName = input.assignedCareWorkerName ?? null;
    if (input.ownerId && !newOwnerName) {
      const user = await this.db
        .prepare("SELECT name FROM users WHERE id = ?")
        .bind(input.ownerId)
        .first<{ name: string }>();
      if (user) newOwnerName = user.name;
    }

    let targetStatus = existing.status;
    let nextAction = input.nextAction ?? existing.next_action;

    if (input.ownerId) {
      if (existing.status === "unassigned") {
        targetStatus = "screening";
      }
      if (!input.nextAction) {
        nextAction = "Review screening findings and initiate contact";
      }
    } else {
      // Explicit unassigned
      targetStatus = "unassigned";
      newOwnerName = null;
      if (!input.nextAction) {
        nextAction = "Assign a care worker";
      }
    }

    await this.db
      .prepare(
        `UPDATE cases
         SET owner_id = ?,
             assigned_care_worker_name = ?,
             status = ?,
             next_action = ?,
             last_activity_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(input.ownerId ?? null, newOwnerName, targetStatus, nextAction, now, now, caseId)
      .run();

    const eventType = existing.owner_id ? "case_reassigned" : "case_assigned";
    const summary = input.ownerId
      ? `Case assigned to ${newOwnerName ?? input.ownerId}${input.reason ? ` (${input.reason})` : ""}`
      : `Case unassigned${input.reason ? ` (${input.reason})` : ""}`;

    await this.timeline.recordCaseEvent({
      caseId,
      actorId: actor.id,
      actorRole: actor.role,
      eventType,
      fromStatus: existing.status,
      toStatus: targetStatus,
      summary,
      metadata: {
        previousOwnerId: existing.owner_id,
        newOwnerId: input.ownerId,
        newOwnerName,
        reason: input.reason,
      },
      createdAt: now,
    });

    return {
      id: existing.id,
      patientId: existing.patient_id,
      status: targetStatus,
      priority: existing.priority,
      ownerId: input.ownerId ?? null,
      assignedCareWorkerName: newOwnerName,
      nextAction,
      dueAt: existing.due_at,
      lastActivityAt: now,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  async transitionCaseStatus(
    caseId: string,
    targetStatus: CaseStatus,
    actor: User,
    reason?: string,
    nextAction?: string
  ): Promise<CareCase> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT * FROM cases WHERE id = ?")
      .bind(caseId)
      .first<{
        id: string;
        patient_id: string;
        status: CaseStatus;
        priority: Priority;
        owner_id: string | null;
        assigned_care_worker_name: string | null;
        next_action: string;
        due_at: string;
        created_at: string;
      }>();

    if (!existing) {
      throw new Error(`Case '${caseId}' not found`);
    }

    // Verify state machine validation
    const transitionCheck = canTransitionStatus(existing.status, targetStatus, actor.role, false);
    if (!transitionCheck.allowed) {
      throw new Error(transitionCheck.reason || "Transition not allowed");
    }

    const updatedNextAction = nextAction ?? existing.next_action;

    await this.db
      .prepare(
        `UPDATE cases 
         SET status = ?, next_action = ?, last_activity_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(targetStatus, updatedNextAction, now, now, caseId)
      .run();

    await this.timeline.recordCaseEvent({
      caseId,
      actorId: actor.id,
      actorRole: actor.role,
      eventType: "status_changed",
      fromStatus: existing.status,
      toStatus: targetStatus,
      summary: `Status changed from '${existing.status}' to '${targetStatus}'${reason ? `: ${reason}` : ""}`,
      metadata: {
        fromStatus: existing.status,
        toStatus: targetStatus,
        reason,
      },
      createdAt: now,
    });

    return {
      id: existing.id,
      patientId: existing.patient_id,
      status: targetStatus,
      priority: existing.priority,
      ownerId: existing.owner_id,
      assignedCareWorkerName: existing.assigned_care_worker_name,
      nextAction: updatedNextAction,
      dueAt: existing.due_at,
      lastActivityAt: now,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  async closeCase(
    caseId: string,
    input: VerifiedClosureInput,
    actor: User
  ): Promise<{ closureRecord: ClosureRecord; careCase: CareCase }> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT * FROM cases WHERE id = ?")
      .bind(caseId)
      .first<{
        id: string;
        patient_id: string;
        status: CaseStatus;
        priority: Priority;
        owner_id: string | null;
        assigned_care_worker_name: string | null;
        next_action: string;
        due_at: string;
        created_at: string;
      }>();

    if (!existing) {
      throw new Error(`Case '${caseId}' not found`);
    }

    // Enforce verified closure safety rules
    const validation = validateCaseClosure({
      actorRole: actor.role,
      actorId: actor.id,
      outcome: input.outcome,
      evidenceNote: input.evidenceNote,
      caseStatus: existing.status,
    });

    if (!validation.valid) {
      throw new Error(validation.reason || "Closure validation failed");
    }

    const closureId = `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Insert closure record
    await this.db
      .prepare(
        `INSERT INTO closure_records
        (id, case_id, outcome, verification_actor_id, verification_actor_role, evidence_note, verified_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        closureId,
        caseId,
        input.outcome,
        actor.id,
        actor.role,
        input.evidenceNote,
        now,
        now
      )
      .run();

    const nextAction = "Verified case closure completed";

    // Transition case to 'completed'
    await this.db
      .prepare(
        `UPDATE cases
         SET status = 'completed',
             next_action = ?,
             last_activity_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(nextAction, now, now, caseId)
      .run();

    // Record immutable audit event
    await this.timeline.recordCaseEvent({
      caseId,
      actorId: actor.id,
      actorRole: actor.role,
      eventType: "verified_closure",
      fromStatus: existing.status,
      toStatus: "completed",
      summary: `Verified case closure recorded with outcome: ${input.outcome}`,
      metadata: {
        closureId,
        outcome: input.outcome,
        evidenceNote: input.evidenceNote,
        verifiedBy: actor.name,
      },
      createdAt: now,
    });

    const closureRecord: ClosureRecord = {
      id: closureId,
      caseId,
      outcome: input.outcome,
      verificationActorId: actor.id,
      verificationActorRole: actor.role as "clinician" | "admin",
      evidenceNote: input.evidenceNote,
      verifiedAt: now,
      createdAt: now,
    };

    const careCase: CareCase = {
      id: existing.id,
      patientId: existing.patient_id,
      status: "completed",
      priority: existing.priority,
      ownerId: existing.owner_id,
      assignedCareWorkerName: existing.assigned_care_worker_name,
      nextAction,
      dueAt: existing.due_at,
      lastActivityAt: now,
      createdAt: existing.created_at,
      updatedAt: now,
    };

    return { closureRecord, careCase };
  }
}
