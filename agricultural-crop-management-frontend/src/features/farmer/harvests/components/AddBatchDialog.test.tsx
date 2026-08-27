import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { HarvestFormData } from "../types";
import { AddBatchDialog } from "./AddBatchDialog";

const mocks = vi.hoisted(() => ({
  useSeasons: vi.fn(),
  useMyWarehouses: vi.fn(),
  useLocations: vi.fn(),
  useHarvestStockContext: vi.fn(),
  useProductWarehouseLots: vi.fn(),
  t: vi.fn((_: string, fallback?: Record<string, unknown> | string) =>
    typeof fallback === "string" ? fallback : "",
  ),
}));

vi.mock("@/entities/season", () => ({
  useSeasons: mocks.useSeasons,
}));

vi.mock("@/entities/inventory", () => ({
  useMyWarehouses: mocks.useMyWarehouses,
  useLocations: mocks.useLocations,
}));

vi.mock("@/entities/harvest", () => ({
  useHarvestStockContext: mocks.useHarvestStockContext,
}));

vi.mock("@/entities/product-warehouse", () => ({
  useProductWarehouseLots: mocks.useProductWarehouseLots,
}));

vi.mock("@/shared/lib/hooks/useI18n", () => ({
  useI18n: () => ({
    t: mocks.t,
  }),
}));

const baseFormData: HarvestFormData = {
  batchId: "",
  date: "2026-05-10",
  quantity: "120",
  grade: "A",
  moisture: "",
  season: "11",
  plot: "21",
  plotName: "Plot Alpha",
  crop: "Rice",
  warehouseId: "7",
  locationId: "",
  productId: "",
  productName: "Rice",
  productVariant: "",
  lotCode: "",
  inventoryUnit: "kg",
  status: "stored",
  notes: "",
  purity: "",
  foreignMatter: "",
  brokenGrains: "",
  harvestLoss: "",
  cropResidueHandling: "",
  qualityGrade: "PASSED",
};

describe("AddBatchDialog", () => {
  it("renders quick entry fields by default", () => {
    mocks.useSeasons.mockReturnValue({
      data: {
        items: [
          {
            id: 11,
            seasonName: "Spring 2026",
            plotId: 21,
            plotName: "Plot Alpha",
            cropName: "Rice",
            startDate: "2026-01-01",
          },
        ],
      },
    });
    mocks.useMyWarehouses.mockReturnValue({
      data: [{ id: 7, name: "Output WH" }],
    });
    mocks.useLocations.mockReturnValue({ data: [] });
    mocks.useProductWarehouseLots.mockReturnValue({ data: { items: [] } });
    mocks.useHarvestStockContext.mockReturnValue({
      isLoading: false,
      data: undefined,
    });

    render(
      <MemoryRouter>
        <AddBatchDialog
          open={true}
          onOpenChange={vi.fn()}
          formData={baseFormData}
          onFormChange={vi.fn()}
          onSubmit={vi.fn()}
          seasonId={11}
          warehouseCount={1}
          onCancel={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Harvest Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Harvest From Plot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Crop \/ Product/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity \(kg\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Grade/i)).toBeInTheDocument();
    expect(screen.getByText(/^Warehouse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quality notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Packaging & processing/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Batch ID Preview")).not.toBeInTheDocument();
  });

  it("shows advanced fields after toggling advanced section", () => {
    mocks.useSeasons.mockReturnValue({
      data: {
        items: [
          {
            id: 11,
            seasonName: "Spring 2026",
            plotId: 21,
            plotName: "Plot Alpha",
            cropName: "Rice",
            startDate: "2026-01-01",
          },
        ],
      },
    });
    mocks.useMyWarehouses.mockReturnValue({
      data: [{ id: 7, name: "Output WH" }],
    });
    mocks.useLocations.mockReturnValue({ data: [] });
    mocks.useProductWarehouseLots.mockReturnValue({ data: { items: [] } });
    mocks.useHarvestStockContext.mockReturnValue({
      isLoading: false,
      data: undefined,
    });

    render(
      <MemoryRouter>
        <AddBatchDialog
          open={true}
          onOpenChange={vi.fn()}
          formData={baseFormData}
          onFormChange={vi.fn()}
          onSubmit={vi.fn()}
          seasonId={11}
          warehouseCount={1}
          onCancel={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Advanced Inventory & Quality"));

    expect(screen.getByLabelText("Batch ID Preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Harvest Loss %")).toBeInTheDocument();
    expect(screen.getByText("Current lot stock context")).toBeInTheDocument();
  });
});
