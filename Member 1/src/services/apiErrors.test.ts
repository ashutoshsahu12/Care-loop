import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./api";

describe("backend error messaging", () => {
  it("surfaces specific validation field issues rather than a generic 400", () => {
    expect(apiErrorMessage({ message: "Validation Error", errors: [
      { path: "patientId", message: "Required" },
      { path: "resultValue", message: "Required" },
    ] })).toBe("patientId: Required; resultValue: Required");
  });
  it("uses helpful backend error messages", () => {
    expect(apiErrorMessage({ message: "No pending notification exists for this case." }))
      .toBe("No pending notification exists for this case.");
    expect(apiErrorMessage({ detail: "Case not found" })).toBe("Case not found");
  });
  it("leaves network failures without API payload to the HTTP client's fallback", () => {
    expect(apiErrorMessage(undefined)).toBeUndefined();
  });
});
