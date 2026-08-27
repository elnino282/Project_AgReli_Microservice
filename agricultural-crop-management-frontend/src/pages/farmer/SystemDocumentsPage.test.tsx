import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SystemDocumentsPage from "./SystemDocumentsPage";

vi.mock("@/features/farmer/documents", () => ({
  DocumentLibrary: () => <div data-testid="document-library">Document library content</div>,
}));

vi.mock("@/features/shared/user-guide", () => ({
  UserGuideContent: ({ portalType, embedded }: { portalType?: string; embedded?: boolean }) => (
    <div data-testid="user-guide" data-portal={portalType} data-embedded={String(embedded)}>
      User guide content
    </div>
  ),
}));

vi.mock("@/shared/lib/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (_key: string, optionsOrDefault?: Record<string, unknown> | string) =>
      typeof optionsOrDefault === "string" ? optionsOrDefault : _key,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SystemDocumentsPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("SystemDocumentsPage", () => {
  it("opens the document library by default and switches to the guide in the same page", async () => {
    const user = userEvent.setup();
    renderPage("/farmer/documents?documentId=12");

    expect(screen.getByTestId("document-library")).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole("tab", { name: "User guide" }));
    });

    expect(screen.getByTestId("user-guide")).toHaveAttribute("data-portal", "FARMER");
    expect(screen.getByTestId("user-guide")).toHaveAttribute("data-embedded", "true");
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/farmer/documents?section=guide",
    );
  });

  it("restores the guide directly from the section query parameter", () => {
    renderPage("/farmer/documents?section=guide");

    expect(screen.getByTestId("user-guide")).toBeInTheDocument();
    expect(screen.queryByTestId("document-library")).not.toBeInTheDocument();
  });
});
