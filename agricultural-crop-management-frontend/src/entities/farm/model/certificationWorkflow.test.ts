import { describe, expect, it } from "vitest";
import {
  CERTIFICATION_STATUS_META,
  CERTIFICATION_WORKFLOW_STEPS,
  getWorkflowStepIndex,
  getWorkflowStepState,
} from "./certificationWorkflow";

describe("certification workflow", () => {
  it("has a Vietnamese label for every persisted status", () => {
    const statuses = CERTIFICATION_WORKFLOW_STEPS.flatMap((step) => step.statuses);
    for (const status of statuses) {
      expect(CERTIFICATION_STATUS_META[status].label).toBeTruthy();
    }
    expect(CERTIFICATION_STATUS_META.REJECTED.terminal).toBe(true);
    expect(CERTIFICATION_STATUS_META.EXPIRED.terminal).toBe(true);
    expect(CERTIFICATION_STATUS_META.REVOKED.terminal).toBe(true);
  });

  it("marks earlier stages complete and later stages upcoming", () => {
    expect(getWorkflowStepIndex("CORRECTIVE_ACTION_SUBMITTED")).toBe(3);
    expect(getWorkflowStepState(2, "CORRECTIVE_ACTION_SUBMITTED")).toBe("completed");
    expect(getWorkflowStepState(3, "CORRECTIVE_ACTION_SUBMITTED")).toBe("current");
    expect(getWorkflowStepState(4, "CORRECTIVE_ACTION_SUBMITTED")).toBe("upcoming");
  });
});
