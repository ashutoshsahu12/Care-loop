import { describe, expect, it } from "vitest";
import { getFreshRouter } from "./helpers/testDb";

describe("connected admin team directory", () => {
  it("returns seeded doctors and care coordinators with real assigned case counts", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/team", {
      headers: { Authorization: "Bearer usr-admin-1" },
    }));
    expect(response.status).toBe(200);
    const members = await response.json() as Array<{
      id: string; name: string; role: string; initials: string; patients: number;
    }>;
    expect(members.some(member => member.id === "usr-cw-1" && member.name === "A. Sharma")).toBe(true);
    expect(members.some(member => member.role === "Physician")).toBe(true);
    expect(members.every(member => Number.isInteger(member.patients) && member.patients >= 0)).toBe(true);
    expect(members.some(member => member.id === "usr-cw-1" && member.patients > 0)).toBe(true);
  });

  it("rejects patient access to administrator team directory", async () => {
    const { router } = getFreshRouter();
    const response = await router.handle(new Request("http://localhost/api/team", {
      headers: { Authorization: "Bearer usr-pt-1001" },
    }));
    expect(response.status).toBe(403);
  });
});
