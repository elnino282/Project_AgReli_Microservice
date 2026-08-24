import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiHarvestPredictionModal } from "./AiHarvestPredictionModal";

const aiApi = vi.hoisted(() => ({ predictHarvest: vi.fn() }));
const dashboardApi = vi.hoisted(() => ({ getFarmingLogs: vi.fn() }));

vi.mock("@/entities/ai/api/client", () => ({ aiApi }));
vi.mock("@/features/farmer/dashboard/api/dashboardApi", () => ({ dashboardApi }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("AiHarvestPredictionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardApi.getFarmingLogs.mockResolvedValue([
      {
        id: "91",
        seasonId: "12",
        date: "2026-08-10",
        activityType: "PESTICIDE",
        description: "Phun thuốc sinh học",
        materialName: "Neem persisted",
        quarantineDays: 5,
        performedBy: "Farmer",
        status: "COMPLETED",
      },
    ]);
    aiApi.predictHarvest.mockResolvedValue({
      predictedHarvestDate: "2026-09-01",
      safeHarvestDate: "2026-09-02",
      recommendation: "Theo dõi PHI",
    });
  });

  it("sends persisted season dates and farming logs instead of demo values", async () => {
    const user = userEvent.setup();
    render(
      <AiHarvestPredictionModal
        seasonId="12"
        seasonName="Lúa"
        plantingDate="2026-06-01"
        plannedHarvestDate="2026-09-01"
      />,
    );

    await user.click(screen.getByRole("button", { name: /AI Dự đoán thu hoạch/i }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu phân tích/i }));

    await waitFor(() => expect(aiApi.predictHarvest).toHaveBeenCalledWith({
      cropName: "Lúa",
      plantingDate: "2026-06-01",
      expectedGrowthDays: 92,
      recentLogs: [{
        date: "2026-08-10",
        activityType: "PESTICIDE",
        materialName: "Neem persisted",
        phiDays: 5,
      }],
    }));
    expect(dashboardApi.getFarmingLogs).toHaveBeenCalledWith("12");
  });
});
