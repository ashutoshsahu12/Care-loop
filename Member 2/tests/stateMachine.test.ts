import { describe, it, expect } from "vitest";
import { canTransitionStatus } from "../src/rules/stateMachine";

describe("Care Coordination State Machine", () => {
  it("allows standard forward transitions", () => {
    expect(canTransitionStatus("unassigned", "screening", "care_worker").allowed).toBe(true);
    expect(canTransitionStatus("screening", "referred", "clinician").allowed).toBe(true);
    expect(canTransitionStatus("referred", "appointment_scheduled", "care_worker").allowed).toBe(true);
    expect(canTransitionStatus("appointment_scheduled", "in_care", "care_worker").allowed).toBe(true);
    expect(canTransitionStatus("in_care", "overdue", "care_worker").allowed).toBe(true);
  });

  it("blocks direct transition to completed without verified closure workflow", () => {
    const result = canTransitionStatus("in_care", "completed", "clinician", false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/verified case closure workflow/);
  });

  it("allows transition to completed ONLY when verified closure flag is present with authorized role", () => {
    const clinicianClosure = canTransitionStatus("in_care", "completed", "clinician", true);
    expect(clinicianClosure.allowed).toBe(true);

    const adminClosure = canTransitionStatus("in_care", "completed", "admin", true);
    expect(adminClosure.allowed).toBe(true);

    const careWorkerClosure = canTransitionStatus("in_care", "completed", "care_worker", true);
    expect(careWorkerClosure.allowed).toBe(false);
    expect(careWorkerClosure.reason).toMatch(/Only a clinician or admin/);
  });

  it("blocks illegal status jumps", () => {
    const illegalJump = canTransitionStatus("unassigned", "in_care", "care_worker");
    expect(illegalJump.allowed).toBe(false);
    expect(illegalJump.reason).toMatch(/Invalid status transition/);
  });

  it("restricts reopening completed cases to clinician or admin", () => {
    const careWorkerReopen = canTransitionStatus("completed", "in_care", "care_worker");
    expect(careWorkerReopen.allowed).toBe(false);

    const clinicianReopen = canTransitionStatus("completed", "in_care", "clinician");
    expect(clinicianReopen.allowed).toBe(true);
  });
});
