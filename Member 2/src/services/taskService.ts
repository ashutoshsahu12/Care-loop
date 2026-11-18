import type { ID1Database } from "../db/client";
import type { FollowUpTask, TaskStatus } from "../types/domain";
import type { User } from "../types/auth";
import type { FollowUpTaskCreateInput, FollowUpTaskUpdateInput } from "../validation/schemas";
import { TimelineService } from "./timelineService";

export class TaskService {
  private db: ID1Database;
  private timeline: TimelineService;

  constructor(db: ID1Database, timeline?: TimelineService) {
    this.db = db;
    this.timeline = timeline ?? new TimelineService(db);
  }

  async createTask(
    caseId: string,
    input: FollowUpTaskCreateInput,
    actor: User
  ): Promise<FollowUpTask> {
    const id = `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO follow_up_tasks 
        (id, case_id, assigned_to_id, title, description, due_date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
      .bind(
        id,
        caseId,
        input.assignedToId,
        input.title,
        input.description ?? null,
        input.dueDate,
        now,
        now
      )
      .run();

    await this.timeline.recordCaseEvent({
      caseId,
      actorId: actor.id,
      actorRole: actor.role,
      eventType: "follow_up_task_created",
      summary: `Follow-up task created: ${input.title}`,
      metadata: {
        taskId: id,
        title: input.title,
        dueDate: input.dueDate,
        assignedToId: input.assignedToId,
      },
      createdAt: now,
    });

    return {
      id,
      caseId,
      assignedToId: input.assignedToId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateTask(
    taskId: string,
    input: FollowUpTaskUpdateInput,
    actor: User
  ): Promise<FollowUpTask> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT * FROM follow_up_tasks WHERE id = ?")
      .bind(taskId)
      .first<{
        id: string;
        case_id: string;
        assigned_to_id: string;
        title: string;
        description: string | null;
        due_date: string;
        status: TaskStatus;
        completed_at: string | null;
        completed_by_id: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!existing) {
      throw new Error(`Task '${taskId}' not found`);
    }

    const isCompleted = input.status === "completed";
    const completedAt = isCompleted ? now : null;
    const completedById = isCompleted ? actor.id : null;

    await this.db
      .prepare(
        `UPDATE follow_up_tasks 
         SET status = ?, description = COALESCE(?, description), completed_at = ?, completed_by_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(input.status, input.description ?? null, completedAt, completedById, now, taskId)
      .run();

    if (isCompleted) {
      await this.timeline.recordCaseEvent({
        caseId: existing.case_id,
        actorId: actor.id,
        actorRole: actor.role,
        eventType: "follow_up_task_completed",
        summary: `Follow-up task completed: ${existing.title}`,
        metadata: { taskId, title: existing.title },
        createdAt: now,
      });
    }

    return {
      id: existing.id,
      caseId: existing.case_id,
      assignedToId: existing.assigned_to_id,
      title: existing.title,
      description: input.description ?? existing.description,
      dueDate: existing.due_date,
      status: input.status,
      completedAt,
      completedById,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  async getTasksByCase(caseId: string): Promise<FollowUpTask[]> {
    const res = await this.db
      .prepare(
        `SELECT id, case_id as caseId, assigned_to_id as assignedToId, title, description,
                due_date as dueDate, status, completed_at as completedAt, completed_by_id as completedById,
                created_at as createdAt, updated_at as updatedAt
         FROM follow_up_tasks WHERE case_id = ? ORDER BY due_date ASC`
      )
      .bind(caseId)
      .all<FollowUpTask>();

    return res.results || [];
  }
}
