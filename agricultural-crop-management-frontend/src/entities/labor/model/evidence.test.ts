import { describe, expect, it } from "vitest";
import { isSupportedEvidenceUrl } from "./evidence";

describe("isSupportedEvidenceUrl", () => {
  it("accepts persisted HTTP image locations", () => {
    expect(isSupportedEvidenceUrl("https://storage.example/evidence/task-1.jpg")).toBe(true);
    expect(isSupportedEvidenceUrl("http://localhost:9000/evidence/task-1.jpg")).toBe(true);
  });

  it("rejects local paths, data URLs and malformed values", () => {
    expect(isSupportedEvidenceUrl("C:\\fake\\evidence.jpg")).toBe(false);
    expect(isSupportedEvidenceUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isSupportedEvidenceUrl("not-a-url")).toBe(false);
  });
});
