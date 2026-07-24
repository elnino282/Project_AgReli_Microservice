import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecentActivityTimeline } from "./RecentActivityTimeline";
import { vi } from "vitest";

vi.mock('@/shared/lib/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: any) => (typeof options === 'string' ? options : (options?.defaultValue ?? key)),
    isLoading: false,
    locale: 'en-US'
  }),
}));

describe("RecentActivityTimeline", () => {
  it("shows empty state when there are no activities", () => {
    render(
      <MemoryRouter>
        <RecentActivityTimeline
          activities={[]}
          isLoading={false}
          errorMessage={null}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("No recent activity yet.")).toBeInTheDocument();
  });

  it("sorts activities by occurredAt descending on render", () => {
    render(
      <MemoryRouter>
        <RecentActivityTimeline
          isLoading={false}
          errorMessage={null}
          activities={[
            {
              id: "a1",
              type: "TASK_UPDATE",
              title: "Older task",
              description: "older",
              occurredAt: "2026-03-10T08:00:00",
              actorName: "Worker A",
              entityType: "TASK",
              entityId: "1",
              actionUrl: "/farmer/seasons/33/workspace/tasks",
            },
            {
              id: "a2",
              type: "FIELD_LOG",
              title: "Newer field log",
              description: "newer",
              occurredAt: "2026-03-11T09:00:00",
              actorName: null,
              entityType: "FIELD_LOG",
              entityId: "2",
              actionUrl: "/farmer/seasons/33/workspace/field-logs",
            },
          ]}
        />
      </MemoryRouter>
    );

    const newer = screen.getByText("Newer field log");
    const older = screen.getByText("Older task");
    expect(
      Boolean(newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true);
  });
});
