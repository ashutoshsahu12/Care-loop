import type { ID1Database } from "../db/client";
import type { Appointment, AppointmentStatus } from "../types/domain";
import type { User } from "../types/auth";
import type { AppointmentCreateInput, AppointmentAttendanceInput } from "../validation/schemas";
import { TimelineService } from "./timelineService";

export class AppointmentService {
  private db: ID1Database;
  private timeline: TimelineService;

  constructor(db: ID1Database, timeline?: TimelineService) {
    this.db = db;
    this.timeline = timeline ?? new TimelineService(db);
  }

  async scheduleAppointment(
    caseId: string,
    input: AppointmentCreateInput,
    actor: User
  ): Promise<Appointment> {
    const id = `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO appointments 
        (id, case_id, referral_id, scheduled_time, facility, provider_name, status, attendance_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'scheduled', NULL, ?, ?)`
      )
      .bind(
        id,
        caseId,
        input.referralId ?? null,
        input.scheduledTime,
        input.facility,
        input.providerName,
        now,
        now
      )
      .run();

    const formattedDate = input.scheduledTime.slice(0, 10);
    const nextAction = `Confirm appointment attendance on ${formattedDate}`;

    // Update case status to appointment_scheduled
    await this.db
      .prepare(
        `UPDATE cases
         SET status = 'appointment_scheduled',
             next_action = ?,
             last_activity_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(nextAction, now, now, caseId)
      .run();

    await this.timeline.recordCaseEvent({
      caseId,
      actorId: actor.id,
      actorRole: actor.role,
      eventType: "appointment_scheduled",
      toStatus: "appointment_scheduled",
      summary: `Appointment scheduled at ${input.facility} with ${input.providerName} for ${input.scheduledTime}`,
      metadata: {
        appointmentId: id,
        facility: input.facility,
        providerName: input.providerName,
        scheduledTime: input.scheduledTime,
      },
      createdAt: now,
    });

    return {
      id,
      caseId,
      referralId: input.referralId ?? null,
      scheduledTime: input.scheduledTime,
      facility: input.facility,
      providerName: input.providerName,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    };
  }

  async recordAttendance(
    appointmentId: string,
    input: AppointmentAttendanceInput,
    actor: User
  ): Promise<Appointment> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT * FROM appointments WHERE id = ?")
      .bind(appointmentId)
      .first<{
        id: string;
        case_id: string;
        referral_id: string | null;
        scheduled_time: string;
        facility: string;
        provider_name: string;
        status: AppointmentStatus;
        attendance_notes: string | null;
        recorded_by_id: string | null;
        recorded_at: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!existing) {
      throw new Error(`Appointment '${appointmentId}' not found`);
    }

    await this.db
      .prepare(
        `UPDATE appointments 
         SET status = ?, attendance_notes = ?, recorded_by_id = ?, recorded_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(input.status, input.attendanceNotes ?? null, actor.id, now, now, appointmentId)
      .run();

    let targetCaseStatus = "in_care";
    let nextAction = "Record clinical follow-up / treatment outcome";

    if (input.status === "no_show") {
      targetCaseStatus = "overdue";
      nextAction = "Contact patient to reschedule missed appointment";
    } else if (input.status === "cancelled" || input.status === "rescheduled") {
      targetCaseStatus = "referred";
      nextAction = "Reschedule required appointment";
    }

    await this.db
      .prepare(
        `UPDATE cases
         SET status = ?,
             next_action = ?,
             last_activity_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(targetCaseStatus, nextAction, now, now, existing.case_id)
      .run();

    await this.timeline.recordCaseEvent({
      caseId: existing.case_id,
      actorId: actor.id,
      actorRole: actor.role,
      eventType: "attendance_recorded",
      fromStatus: "appointment_scheduled",
      toStatus: targetCaseStatus as any,
      summary: `Appointment attendance recorded: ${input.status} at ${existing.facility}`,
      metadata: {
        appointmentId,
        attendanceStatus: input.status,
        attendanceNotes: input.attendanceNotes,
      },
      createdAt: now,
    });

    return {
      id: existing.id,
      caseId: existing.case_id,
      referralId: existing.referral_id,
      scheduledTime: existing.scheduled_time,
      facility: existing.facility,
      providerName: existing.provider_name,
      status: input.status,
      attendanceNotes: input.attendanceNotes ?? null,
      recordedById: actor.id,
      recordedAt: now,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  async getAppointmentsByCase(caseId: string): Promise<Appointment[]> {
    const res = await this.db
      .prepare(
        `SELECT id, case_id as caseId, referral_id as referralId, scheduled_time as scheduledTime,
                facility, provider_name as providerName, status, attendance_notes as attendanceNotes,
                recorded_by_id as recordedById, recorded_at as recordedAt, created_at as createdAt, updated_at as updatedAt
         FROM appointments WHERE case_id = ? ORDER BY scheduled_time ASC`
      )
      .bind(caseId)
      .all<Appointment>();

    return res.results || [];
  }
}
