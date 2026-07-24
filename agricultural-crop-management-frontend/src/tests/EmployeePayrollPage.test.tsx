import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EmployeePayrollPage } from "@/pages/employee/EmployeePayrollPage";
const laborHooks = vi.hoisted(() => ({
  useEmployeePayrollRecords: vi.fn(),
  useEmployeePayrollDetail: vi.fn(),
}));

vi.mock("@/entities/labor", () => ({
  useEmployeePayrollRecords: laborHooks.useEmployeePayrollRecords,
  useEmployeePayrollDetail: laborHooks.useEmployeePayrollDetail,
}));

describe("EmployeePayrollPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    laborHooks.useEmployeePayrollRecords.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            seasonId: 11,
            seasonName: "Spring 2026",
            employeeUserId: 101,
            employeeName: "Worker A",
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            totalAssignedTasks: 12,
            totalCompletedTasks: 10,
            wagePerTask: 175000,
            totalAmount: 1750000,
            generatedAt: "2026-03-31T18:00:00",
            note: "Reviewed by farmer",
          },
        ],
      },
      isLoading: false,
    });

    laborHooks.useEmployeePayrollDetail.mockImplementation(
      (payrollRecordId: number | null | undefined) => ({
        data:
          payrollRecordId === 1
            ? {
                id: 1,
                seasonId: 11,
                seasonName: "Spring 2026",
                employeeUserId: 101,
                employeeName: "Worker A",
                periodStart: "2026-03-01",
                periodEnd: "2026-03-31",
                totalAssignedTasks: 12,
                totalCompletedTasks: 10,
                wagePerTask: 175000,
                totalAmount: 1750000,
                generatedAt: "2026-03-31T18:00:00",
                note: "Reviewed by farmer",
              }
            : undefined,
        isLoading: false,
        isError: false,
      })
    );
  });

  it("renders payroll list and opens selected payroll detail", async () => {
    render(
      <MemoryRouter>
        <EmployeePayrollPage />
      </MemoryRouter>
    );

    expect(screen.getByText("employee.payroll.title")).toBeInTheDocument();
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "employee.payroll.actions.viewDetail" }));

    expect(await screen.findByText("employee.payroll.detail.title")).toBeInTheDocument();
    expect(screen.getByText("Reviewed by farmer")).toBeInTheDocument();
  });
});
