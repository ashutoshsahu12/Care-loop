import { describe, expect, it } from "vitest";
import { createCareCaseId } from "../src/services/caseService";

describe("synthetic case identifier reliability", () => {
  it("generates unique, URL-safe case IDs without colliding with legacy seed IDs", () => {
    const ids = Array.from({ length: 500 }, () => createCareCaseId());
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => /^CL-[0-9A-F]{12}$/.test(id))).toBe(true);
    expect(ids).not.toContain("CL-1001");
  });
});
