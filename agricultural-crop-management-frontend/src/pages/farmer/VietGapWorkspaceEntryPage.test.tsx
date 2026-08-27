import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactRouterDom from "react-router-dom";
import VietGapWorkspaceEntryPage from "./VietGapWorkspaceEntryPage";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useFarms: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>("react-router-dom");
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@/entities/farm", () => ({ useFarms: mocks.useFarms }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { area?: string }) =>
      key === "vietGapWorkspace.area" ? `Diện tích: ${options?.area} ha` : key,
  }),
}));

const farm = (id: number, name: string) => ({
  id,
  name,
  area: 5,
  active: true,
  provinceName: "Đồng Tháp",
});

describe("VietGapWorkspaceEntryPage", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.useFarms.mockReset();
  });

  it("opens the only farm certification workspace directly", async () => {
    mocks.useFarms.mockReturnValue({
      data: { content: [farm(12, "Nông trại A")] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<VietGapWorkspaceEntryPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith(
        "/farmer/farms/12/certification",
        { replace: true },
      );
    });
  });

  it("lets the farmer choose the correct workspace when multiple farms exist", async () => {
    mocks.useFarms.mockReturnValue({
      data: { content: [farm(12, "Nông trại A"), farm(15, "Nông trại B")] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<VietGapWorkspaceEntryPage />);

    await userEvent.click(screen.getByRole("button", { name: /Nông trại B/i }));

    expect(mocks.navigate).toHaveBeenCalledWith("/farmer/farms/15/certification");
  });
});
