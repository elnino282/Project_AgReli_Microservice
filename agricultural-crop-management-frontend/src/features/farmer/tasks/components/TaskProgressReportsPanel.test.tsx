import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskProgressReportsPanel } from "./TaskProgressReportsPanel";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/entities/labor", () => ({
  useSeasonProgressLogs: () => ({
    data: {
      items: [{
        id: 1,
        taskId: 42,
        taskTitle: "Thu hoạch",
        seasonId: 7,
        employeeUserId: 9,
        employeeName: "Nguyễn Văn A",
        progressPercent: 100,
        note: "Đã hoàn tất",
        loggedAt: "2026-08-25T08:00:00",
      }],
    },
    isLoading: false,
    isFetching: false,
    refetch: mocks.refetch,
  }),
  useApproveTask: () => ({ mutate: mocks.approve, isPending: false }),
  useRejectTask: () => ({ mutate: mocks.reject, isPending: false }),
}));

vi.mock("@/shared/lib/hooks/useI18n", () => ({
  useI18n: () => ({
    locale: "vi-VN",
    t: (key: string, params?: { id?: number }) => params?.id ? `${key}-${params.id}` : key,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

describe("TaskProgressReportsPanel approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refetch.mockResolvedValue(undefined);
  });

  it("calls the real approval mutation and reports success only after the server callback", async () => {
    mocks.approve.mockImplementation((_taskId, options) => options.onSuccess());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TaskProgressReportsPanel seasonId={7} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Duyệt" }));
    await user.click(screen.getByRole("button", { name: "Duyệt & Tính lương" }));

    expect(mocks.approve).toHaveBeenCalledWith(42, expect.objectContaining({
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    }));
    await waitFor(() => {
      expect(mocks.success).toHaveBeenCalledWith(expect.stringContaining("cập nhật bảng lương"));
      expect(mocks.refetch).toHaveBeenCalled();
    });
  });

  it("requires and sends a rejection reason", async () => {
    mocks.reject.mockImplementation((_variables, options) => options.onSuccess());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TaskProgressReportsPanel seasonId={7} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Duyệt" }));
    const rejectButton = screen.getByRole("button", { name: "Từ chối" });
    expect(rejectButton).toBeDisabled();
    await user.type(screen.getByLabelText("Lý do từ chối"), "Evidence chưa rõ");
    await user.click(rejectButton);

    expect(mocks.reject).toHaveBeenCalledWith(
      { taskId: 42, rejectReason: "Evidence chưa rõ" },
      expect.any(Object),
    );
  });
});
