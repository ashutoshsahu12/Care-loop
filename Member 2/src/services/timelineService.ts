import type { ID1Database } from "../db/client";
import type { CaseEvent, CaseEventType } from "../types/audit";
import type { CaseStatus } from "../types/admin";
import type { UserRole } from "../types/auth";

export class TimelineService {
  private db: ID1Database;

  constructor(db: ID1Database) {
    this.db = db;
  }

  async recordCaseEvent(input: {
    caseId: string;
    actorId: string;
    actorRole: UserRole;
    eventType: CaseEventType;
    fromStatus?: CaseStatus | null;
    toStatus?: CaseStatus | null;
    summary: string;
    metadata?: Record<string, unknown> | null;
    createdAt?: string;
  }): Promise<CaseEvent> {
    const id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = input.createdAt ?? new Date().toISOString();
    const metadataStr = input.metadata ? JSON.stringify(input.metadata) : null;

    await this.db
      .prepare(
        `INSERT INTO case_events 
        (id, case_id, actor_id, actor_role, event_type, from_status, to_status, summary, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.caseId,
        input.actorId,
        input.actorRole,
        input.eventType,
        input.fromStatus ?? null,
        input.toStatus ?? null,
        input.summary,
        metadataStr,
        now
      )
      .run();

    // Update last_activity_at on the case
    await this.db
      .prepare(`UPDATE cases SET last_activity_at = ?, updated_at = ? WHERE id = ?`)
      .bind(now, now, input.caseId)
      .run();

    return {
      id,
      caseId: input.caseId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      summary: input.summary,
      metadata: input.metadata ?? null,
      createdAt: now,
    };
  }

  async getCaseTimeline(caseId: string): Promise<CaseEvent[]> {
    interface DbEventRow {
      id: string;
      case_id: string;
      actor_id: string;
      actor_role: UserRole;
      event_type: CaseEventType;
      from_status: CaseStatus | null;
      to_status: CaseStatus | null;
      summary: string;
      metadata: string | null;
      created_at: string;
    }

    const res = await this.db
      .prepare(
        `SELECT id, case_id, actor_id, actor_role, event_type, from_status, to_status, summary, metadata, created_at
         FROM case_events
         WHERE case_id = ?
         ORDER BY created_at ASC`
      )
      .bind(caseId)
      .all<DbEventRow>();

    return (res.results || []).map((row) => ({
      id: row.id,
      caseId: row.case_id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      eventType: row.event_type,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      summary: row.summary,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at,
    }));
  }
}
