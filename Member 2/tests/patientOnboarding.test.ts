import { describe, it, expect } from "vitest";
import { getFreshRouter } from "./helpers/testDb";

describe("connected synthetic patient onboarding", () => {
  it("registers a patient and creates a screening case visible to admins", async () => {
    const { router } = getFreshRouter();
    const registration = await router.handle(new Request("http://localhost/api/patients", {
      method: "POST", headers: { "Content-Type": "application/json", "x-user-role": "admin" },
      body: JSON.stringify({
        name: "New Demo Patient", age: 41, gender: "female",
        phone: "0000000000", email: "new.demo@example.test",
      }),
    }));
    expect(registration.status).toBe(201);
    const patient = await registration.json() as { id: string; patientReference: string };
    expect(patient.patientReference).toMatch(/^CL-P-/);

    const lookup = await router.handle(new Request(`http://localhost/api/patients/${patient.patientReference}`));
    expect(lookup.status).toBe(200);

    const screening = await router.handle(new Request("http://localhost/api/screenings", {
      method: "POST", headers: { "Content-Type": "application/json", "x-user-role": "care_worker" },
      body: JSON.stringify({ patientId: patient.id, screeningType: "cardiovascular", resultValue: "BP 150/95" }),
    }));
    expect(screening.status).toBe(201);
    const result = await screening.json() as { careCase: { id: string } };
    expect(result.careCase.id).toMatch(/^CL-/);

    const overview = await router.handle(new Request("http://localhost/api/admin/overview"));
    const data = await overview.json() as { totalPatients: number; totalCases: number };
    expect(data.totalPatients).toBeGreaterThanOrEqual(13);
    expect(data.totalCases).toBeGreaterThanOrEqual(13);

    const cases = await router.handle(new Request(`http://localhost/api/admin/cases?search=${patient.patientReference}`));
    const rows = await cases.json() as Array<{ id: string; patientReference: string }>;
    expect(rows.some(row => row.id === result.careCase.id && row.patientReference === patient.patientReference)).toBe(true);
  });
});
