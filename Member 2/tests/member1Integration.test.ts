import { describe, expect, it } from "vitest";
import { getFreshRouter } from "./helpers/testDb";

describe("Member 1 connected demo adapter routes", () => {
  it("records a patient help request in the backend timeline", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/cases/CL-1001/help-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": "patient" },
      body: JSON.stringify({ message: "Please call me about the next appointment" }),
    }));
    expect(response.status).toBe(201);
    const timeline = await router.handle(new Request("http://localhost/api/cases/CL-1001/timeline"));
    const events = await timeline.json() as Array<{ eventType: string }>;
    expect(events.some(event => event.eventType === "help_requested")).toBe(true);
  });
  it("records clinical review notes without replacing case state", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/cases/CL-1001/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": "clinician" },
      body: JSON.stringify({ text: "Reviewed the screening result with the patient." }),
    }));
    expect(response.status).toBe(201);
    const timeline = await router.handle(new Request("http://localhost/api/cases/CL-1001/timeline"));
    const events = await timeline.json() as Array<{ eventType: string }>;
    expect(events.some(event => event.eventType === "clinical_review")).toBe(true);
  });
});
