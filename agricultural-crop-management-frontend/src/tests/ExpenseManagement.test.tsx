import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ExpenseManagement } from "@/features/farmer/expense-management";
import type { ExpenseFormData } from "@/features/farmer/expense-management/types";

const mockUseExpenseManagement = vi.fn();

const buildHookState = (overrides?: Record<string, unknown>) => {
    const formData: ExpenseFormData = {
        date: "",
        category: "",
        description: "",
        linkedTask: "",
        linkedTaskId: undefined,
        linkedSeason: "Spring 2026",
        linkedSeasonId: 1,
        linkedPlotId: 1,
        amount: "",
        status: "PENDING",
        notes: "",
        vendor: "",
        vendorId: undefined,
        attachmentFile: null,
        attachmentName: undefined,
        attachmentUrl: undefined,
    };

    return {
        activeTab: "list",
        setActiveTab: vi.fn(),
        isAddExpenseOpen: false,
        setIsAddExpenseOpen: vi.fn(),
        selectedExpense: null,
        searchQuery: "",
        setSearchQuery: vi.fn(),
        selectedSeason: "1",
        setSelectedSeason: vi.fn(),
        selectedCategory: "all",
        setSelectedCategory: vi.fn(),
        selectedStatus: "all",
        setSelectedStatus: vi.fn(),
        seasonOptions: [{ value: "1", label: "Spring 2026" }],
        taskOptions: [],
        supplierOptions: [],
        isLoadingTasks: false,
        handleTaskChange: vi.fn(),
        expenses: [
            {
                id: 1,
                date: "2026-01-05",
                category: "Fertilizer",
                description: "NPK Fertilizer",
                linkedSeason: "Spring 2026",
                linkedSeasonId: 1,
                linkedPlotId: 1,
                amount: 5_000_000,
                status: "PAID",
                notes: "",
            },
        ],
        filteredExpenses: [
            {
                id: 1,
                date: "2026-01-05",
                category: "Fertilizer",
                description: "NPK Fertilizer",
                linkedSeason: "Spring 2026",
                linkedSeasonId: 1,
                linkedPlotId: 1,
                amount: 5_000_000,
                status: "PAID",
                notes: "",
            },
        ],
        totalCount: 1,
        formData,
        setFormData: vi.fn(),
        totalExpenses: 5_000_000,
        budgetUsagePercentage: 20,
        remainingBudget: 20_000_000,
        paidExpenses: 5_000_000,
        unpaidExpenses: 0,
        budgetAmount: 25_000_000,
        pendingExpenses: [],
        handleAddExpense: vi.fn(),
        handleEditExpense: vi.fn(),
        handleDeleteExpense: vi.fn(),
        handleQuickUpdate: vi.fn(),
        handleExportExpenses: vi.fn(),
        resetForm: vi.fn(),
        handleOpenAddExpense: vi.fn(),
        isLoading: false,
        error: null,
        hasSeason: true,
        refetch: vi.fn(),
        isDeleting: false,
        isCreating: false,
        isUpdating: false,
        showValidationErrors: false,
        ...overrides,
    };
};

vi.mock("@/shared/lib/hooks/useI18n", () => ({
    useI18n: () => ({
        t: (key: string) => {
            const dictionary: Record<string, string> = {
                "expenses.pageTitle": "Expense Management",
                "expenses.subtitle": "Track and optimize your farm spending",
                "expenses.tabs.list": "List",
                "expenses.tabs.analytics": "Analytics",
                "expenses.reminders": "Reminders",
                "expenses.export": "Export",
                "expenses.createButton": "Add Expense",
            };
            return dictionary[key] ?? key;
        },
    }),
}));

vi.mock("@/shared/lib/hooks/useI18n", () => ({
    useI18n: () => ({
        t: (key: string, optionsOrDefault?: Record<string, unknown> | string) => {
            if (typeof optionsOrDefault === "string") return optionsOrDefault;
            const dictionary: Record<string, string> = {
                "expenses.pageTitle": "Expense Management",
                "expenses.subtitle": "Track and optimize your farm spending",
                "expenses.tabs.list": "List",
                "expenses.tabs.analytics": "Analytics",
                "expenses.reminders": "Reminders",
                "expenses.export": "Export",
                "expenses.createButton": "Add Expense",
                "expenses.status.paid": "Paid",
                "expenses.status.pending": "Pending",
                "expenses.status.unpaid": "Unpaid",
                "expenses.table.showingCount": `Showing ${optionsOrDefault?.shown ?? 0} of ${optionsOrDefault?.total ?? 0} expenses`,
                "expenses.table.totalAmount": `Total: ${optionsOrDefault?.amount ?? ""}`,
                "expenses.table.columns.date": "Date",
                "expenses.table.columns.category": "Category",
                "expenses.table.columns.description": "Description",
                "expenses.table.columns.linkedTo": "Linked To",
                "expenses.table.columns.amount": "Amount",
                "expenses.table.columns.status": "Status",
                "expenses.table.columns.receipt": "Receipt",
                "expenses.table.columns.actions": "Actions",
                "expenses.table.emptyTitle": "No expenses found",
                "expenses.table.emptyDescription": "Try adjusting your filters",
                "expenses.table.openNewTab": "Open tab",
                "expenses.table.receiptFallback": "Receipt",
                "expenses.table.viewDetails": "View Details",
                "expenses.table.downloadReceipt": "Download receipt (open tab)",
                "common.edit": "Edit",
                "common.delete": "Delete",
            };
            return dictionary[key] ?? key;
        },
    }),
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const dictionary: Record<string, string> = {
                "expenses.overview.budgetTracker": "Budget Tracker",
                "expenses.overview.budgetNotSet": "No budget has been set for this season.",
                "expenses.overview.setBudget": "Set Budget",
                "expenses.overview.budgetUsage": "Budget Usage",
                "expenses.overview.used": "Used",
                "expenses.overview.remaining": "Remaining",
                "expenses.overview.total": "Total",
                "expenses.overview.paid": "Paid",
                "expenses.overview.unpaid": "Unpaid",
                "expenses.overview.pendingExpenses": "Pending Expenses",
                "expenses.overview.awaitingPayment": "awaiting payment",
                "expenses.overview.noPending": "No pending expenses.",
            };
            return dictionary[key] ?? key;
        },
    }),
}));

vi.mock("@/features/farmer/expense-management/hooks/useExpenseManagement", () => ({
    useExpenseManagement: () => mockUseExpenseManagement(),
}));

vi.mock("@/features/farmer/expense-management/components/ExpenseAnalytics", () => ({
    ExpenseAnalytics: () => <div>Analytics</div>,
}));

vi.mock("@/features/farmer/expense-management/components/AIOptimizationTips", () => ({
    AIOptimizationTips: () => <div>Cost insights</div>,
}));

vi.mock("@/shared/contexts", () => ({
    usePreferences: () => ({
        preferences: { currency: "USD", locale: "en-US" },
    }),
    useOptionalSeason: () => null,
}));

describe("ExpenseManagement", () => {
    beforeEach(() => {
        mockUseExpenseManagement.mockReturnValue(buildHookState());
    });

    it("renders list view and budget tracker with mocked data", () => {
        render(
            <MemoryRouter>
                <ExpenseManagement />
            </MemoryRouter>
        );

        expect(screen.getByText("Expense Management")).toBeInTheDocument();
        expect(screen.getByText("Fertilizer")).toBeInTheDocument();
        expect(screen.getByText("Budget Tracker")).toBeInTheDocument();
        expect(screen.getByText("Cost insights")).toBeInTheDocument();
    });

    it("shows empty state when there are no expenses", () => {
        mockUseExpenseManagement.mockReturnValueOnce(buildHookState({
            expenses: [],
            filteredExpenses: [],
            totalCount: 0,
            totalExpenses: 0,
            paidExpenses: 0,
            unpaidExpenses: 0,
            pendingExpenses: [],
        }));

        render(
            <MemoryRouter>
                <ExpenseManagement />
            </MemoryRouter>
        );

        expect(screen.getByText("No expenses found")).toBeInTheDocument();
    });
});
