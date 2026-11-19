import type { ID1Database } from "../db/client";
import type { Referral, ReferralStatus } from "../types/domain";
import type { User } from "../types/auth";
import type { ReferralCreateInput, ReferralStatusUpdateInput } from "../validation/schemas";
import { TimelineService } from "./timelineService";

export class ReferralService {
  private db: ID1Database;
  private timeline: TimelineService;

  constructor(db: ID1Database, timeline?: TimelineService) {
    this.db = db;
    this.timeline = timeline ?? new TimelineService(db);
  }

  async createReferral(
    caseId: string,
    input: ReferralCreateInput,
    actor: User
  ): Promise<Referral> {
    const id = `ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO referrals 
        (id, case_id, referring_provider_id, target_facility, specialty, urgency, status, notes, handoff_clinician_id, handoff_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending_acceptance', ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        caseId,
        actor.id,
        input.targetFacility,
        input.specialty,
        input.urgency,
        input.notes ?? null,
        input.handoffClinicianId ?? null,
        input.handoffNotes ?? null,
        now,
        now
      )
      .run();

    // Update case status to 'referred' and next_action
    const nextAction = `Confirm referral acceptance from ${input.targetFacility}`;
    await this.db
      .prepare(
        `UPDATE cases 
         SET status = CASE WHEN status = 'screening' OR status = 'unassigned' THEN 'referred' ELSE status END,
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
      eventType: "referral_created",
      fromStatus: "screening",
      toStatus: "referred",
      summary: `Referral created to ${input.targetFacility} (${input.specialty})`,
      metadata: {
        referralId: id,
        specialty: input.specialty,
        targetFacility: input.targetFacility,
        urgency: input.urgency,
      },
      createdAt: now,
    });

    if (input.handoffClinicianId || input.handoffNotes) {
      await this.timeline.recordCaseEvent({
        caseId,
        actorId: actor.id,
        actorRole: actor.role,
        eventType: "clinician_handoff",
        fromStatus: "referred",
        toStatus: "referred",
        summary: `Clinician handoff notes recorded for ${input.targetFacility}`,
        metadata: {
          handoffClinicianId: input.handoffClinicianId,
          handoffNotes: input.handoffNotes,
        },
        createdAt: now,
      });
    }

    return {
      id,
      caseId,
      referringProviderId: actor.id,
      targetFacility: input.targetFacility,
      specialty: input.specialty,
      urgency: input.urgency,
      status: "pending_acceptance",
      notes: input.notes ?? null,
      handoffClinicianId: input.handoffClinicianId ?? null,
      handoffNotes: input.handoffNotes ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateReferralStatus(
    referralId: string,
    input: ReferralStatusUpdateInput,
    actor: User
  ): Promise<Referral> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT * FROM referrals WHERE id = ?")
      .bind(referralId)
      .first<{
        id: string;
        case_id: string;
        referring_provider_id: string;
        target_facility: string;
        specialty: string;
        urgency: "routine" | "urgent" | "critical";
        status: ReferralStatus;
        notes: string | null;
        handoff_clinician_id: string | null;
        handoff_notes: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!existing) {
      throw new Error(`Referral '${referralId}' not found`);
    }

    await this.db
      .prepare(
        `UPDATE referrals
         SET status = ?, notes = COALESCE(?, notes), handoff_notes = COALESCE(?, handoff_notes), updated_at = ?
         WHERE id = ?`
      )
      .bind(input.status, input.notes ?? null, input.handoffNotes ?? null, now, referralId)
      .run();

    let nextAction = `Review referral status (${input.status})`;
    if (input.status === "accepted") {
      nextAction = "Schedule consultation with specialist";
    }

    await this.db
      .prepare(`UPDATE cases SET next_action = ?, last_activity_at = ?, updated_at = ? WHERE id = ?`)
      .bind(nextAction, now, now, existing.case_id)
      .run();

    await this.timeline.recordCaseEvent({
      caseId: existing.case_id,
      actorId: actor.id,
      actorRole: actor.role,
      eventType: "referral_status_updated",
      summary: `Referral status updated from '${existing.status}' to '${input.status}'`,
      metadata: {
        referralId,
        fromStatus: existing.status,
        toStatus: input.status,
        notes: input.notes,
      },
      createdAt: now,
    });

    return {
      id: existing.id,
      caseId: existing.case_id,
      referringProviderId: existing.referring_provider_id,
      targetFacility: existing.target_facility,
      specialty: existing.specialty,
      urgency: existing.urgency,
      status: input.status,
      notes: input.notes ?? existing.notes,
      handoffClinicianId: input.handoffClinicianId ?? existing.handoff_clinician_id,
      handoffNotes: input.handoffNotes ?? existing.handoff_notes,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  async handoffReferral(
    referralId: string,
    input: {
      targetClinicianId: string;
      targetFacility?: string;
      handoffNotes: string;
    },
    actor: User
  ): Promise<Referral> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT * FROM referrals WHERE id = ?")
      .bind(referralId)
      .first<{
        id: string;
        case_id: string;
        referring_provider_id: string;
        target_facility: string;
        specialty: string;
        urgency: "routine" | "urgent" | "critical";
        status: ReferralStatus;
        notes: string | null;
        handoff_clinician_id: string | null;
        handoff_notes: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!existing) {
      throw new Error(`Referral '${referralId}' not found`);
    }

    const facility = input.targetFacility ?? existing.target_facility;

    await this.db
      .prepare(
        `UPDATE referrals
         SET handoff_clinician_id = ?, handoff_notes = ?, target_facility = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(input.targetClinicianId, input.handoffNotes, facility, now, referralId)
      .run();

    const receivingClinician = await this.db
      .prepare("SELECT name FROM users WHERE id = ?")
      .bind(input.targetClinicianId)
      .first<{ name: string }>();

    const clinicianName = receivingClinician?.name ?? input.targetClinicianId;
    const nextAction = `Clinician handoff to ${clinicianName} at ${facility}`;

    await this.db
      .prepare(`UPDATE cases SET next_action = ?, last_activity_at = ?, updated_at = ? WHERE id = ?`)
      .bind(nextAction, now, now, existing.case_id)
      .run();

    await this.timeline.recordCaseEvent({
      caseId: existing.case_id,
      actorId: actor.id,
      actorRole: actor.role,
      eventType: "clinician_handoff",
      summary: `Clinician handoff to ${clinicianName} at ${facility}`,
      metadata: {
        referralId,
        transferringClinicianId: actor.id,
        transferringClinicianName: actor.name,
        receivingClinicianId: input.targetClinicianId,
        receivingClinicianName: clinicianName,
        facility,
        handoffNotes: input.handoffNotes,
      },
      createdAt: now,
    });

    return {
      id: existing.id,
      caseId: existing.case_id,
      referringProviderId: existing.referring_provider_id,
      targetFacility: facility,
      specialty: existing.specialty,
      urgency: existing.urgency,
      status: existing.status,
      notes: existing.notes,
      handoffClinicianId: input.targetClinicianId,
      handoffNotes: input.handoffNotes,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  async getReferralsByCase(caseId: string): Promise<Referral[]> {
    const res = await this.db
      .prepare(
        `SELECT id, case_id as caseId, referring_provider_id as referringProviderId,
                target_facility as targetFacility, specialty, urgency, status, notes,
                handoff_clinician_id as handoffClinicianId, handoff_notes as handoffNotes,
                acknowledged_at as acknowledgedAt, created_at as createdAt, updated_at as updatedAt
         FROM referrals WHERE case_id = ? ORDER BY created_at ASC`
      )
      .bind(caseId)
      .all<Referral>();

    return res.results || [];
  }
}
