import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AIOptimizationTips } from "./AIOptimizationTips";



vi.mock("@/shared/contexts", () => ({
    usePreferences: () => ({
        preferences: {
            currency: "USD",
            locale: "en-US",
        },
    }),
}));

vi.mock("@/shared/lib/hooks/useI18n", () => ({
    useI18n: () => ({
        t: (key: string, optionsOrDefault?: Record<string, unknown> | string) => {
            if (typeof optionsOrDefault === "string") return optionsOrDefault;
            if (optionsOrDefault?.defaultValue) return String(optionsOrDefault.defaultValue);
            const dictionary: Record<string, string> = {
                "expenses.insights.title": "Cost insights",
                "expenses.insights.description": "Built from recorded expenses and seasonal cost summary.",
                "expenses.insights.selectSeason": "Select a season to view insights.",
                "expenses.insights.loading": "Loading cost insights...",
                "expenses.insights.empty": "No expense records yet. Add expenses to generate cost insights.",
                "expenses.insights.aiAnalyze": "Analyze with AI",
                "expenses.insights.aiAnalyzing": "Analyzing with AI...",
                "expenses.insights.aiError": "Failed to analyze with AI.",
                "expenses.insights.aiSuggestion": "AI suggestion",
                "expenses.insights.disclaimerLabel": "Disclaimer:",
                "expenses.insights.fallbackDisclaimer": "AI suggestions are references only. Do not auto-apply expense or budget changes.",
                "expenses.insights.uncategorized": "Uncategorized",
                "expenses.insights.summary.warningTitle": "Budget/cost warning",
                "expenses.insights.summary.topCategory.title": "Top category from seasonal summary",
                "expenses.insights.summary.topCategory.description": `${optionsOrDefault?.category ?? ""} is currently the largest cost category in this season summary.`,
                "expenses.insights.local.highestCostCategory.title": "Highest cost category",
                "expenses.insights.local.highestCostCategory.description": `${optionsOrDefault?.category ?? ""} accounts for ${optionsOrDefault?.percent ?? ""}% of recorded spend.`,
                "expenses.insights.local.averageExpense.title": "Average expense amount",
                "expenses.insights.local.averageExpense.description": `Average amount across ${optionsOrDefault?.count ?? ""} expenses.`,
                "expenses.insights.local.missingReceipts.title": "Expenses missing receipt proof",
                "expenses.insights.local.missingReceipts.description": `${optionsOrDefault?.count ?? ""} expense record(s) have no attachment.`,
                "expenses.insights.local.recentTrend.title": "Recent 30-day trend",
                "expenses.insights.local.recentTrend.up": "up",
                "expenses.insights.local.recentTrend.down": "down",
                "expenses.insights.local.recentTrend.description": `Spend is ${optionsOrDefault?.trend ?? ""} ${optionsOrDefault?.percent ?? ""}% vs the previous 30 days.`,
                "common.retry": "Retry",
            };
            return dictionary[key] ?? key;
        },
    }),
}));

describe("AIOptimizationTips", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders deterministic cost insights from real expense rows", () => {
        render(
            <AIOptimizationTips
                seasonId={1}
                expenses={[
                    {
                        id: 1,
                        date: "2026-05-10",
                        category: "Labor",
                        description: "Worker payment",
                        linkedSeasonId: 1,
                        linkedPlotId: 1,
                        amount: 500,
                        status: "PENDING",
                    },
                    {
                        id: 2,
                        date: "2026-05-12",
                        category: "Fertilizer",
                        description: "NPK",
                        linkedSeasonId: 1,
                        linkedPlotId: 1,
                        amount: 300,
                        status: "PENDING",
                        attachmentUrl: "https://example.com/receipt.jpg",
                    },
                ]}
            />
        );

        expect(screen.getByText("Cost insights")).toBeInTheDocument();
        expect(screen.getByText("Highest cost category")).toBeInTheDocument();
        expect(screen.getByText("Average expense amount")).toBeInTheDocument();
    });

    it("shows empty state with no fake tips when expenses are empty", () => {
        render(<AIOptimizationTips seasonId={1} expenses={[]} />);

        expect(
            screen.getByText("No expense records yet. Add expenses to generate cost insights.")
        ).toBeInTheDocument();
        expect(screen.queryByText("View All Insights")).not.toBeInTheDocument();
    });
});
