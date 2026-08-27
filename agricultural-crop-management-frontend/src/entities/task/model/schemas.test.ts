import { describe, expect, it } from "vitest";
import { TaskSchema } from "./schemas";

describe("TaskSchema", () => {
  it("preserves denormalized plot fields required by the employee portal", () => {
    const parsed = TaskSchema.parse({
      taskId: 1,
      title: "Inspect irrigation line",
      status: "IN_PROGRESS",
      plotId: 7,
      plotName: "Plot A1",
      plotArea: 5,
      estimatedDays: 2,
      estimatedCompletionDate: "2026-08-29",
    });

    expect(parsed).toMatchObject({
      plotName: "Plot A1",
      plotArea: 5,
      estimatedCompletionDate: "2026-08-29",
    });
  });
});
