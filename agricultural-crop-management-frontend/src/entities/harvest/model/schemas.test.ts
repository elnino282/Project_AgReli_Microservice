import { describe, expect, it } from "vitest";
import {
  HarvestCreateRequestSchema,
  HarvestSchema,
  HarvestUpdateRequestSchema,
} from "./schemas";

const advancedFields = {
  qualityGrade: "PASSED" as const,
  qualityNotes: "Golden grains; moisture after drying 14%",
  packagingType: "BULK_BAG" as const,
  packagingCount: 690,
  processingType: "DRIED" as const,
  grossWetWeight: 40000,
};

describe("harvest advanced schemas", () => {
  it("keeps advanced response fields instead of stripping them", () => {
    const parsed = HarvestSchema.parse({
      id: 1,
      harvestDate: "2026-08-20",
      quantity: 34500,
      grade: "A",
      netDryWeight: 34500,
      ...advancedFields,
    });

    expect(parsed).toMatchObject({
      grade: "A",
      netDryWeight: 34500,
      ...advancedFields,
    });
  });

  it("keeps advanced create and update fields in validated payloads", () => {
    const common = {
      harvestDate: "2026-08-20",
      quantity: 34500,
      unit: 1,
      grade: "A",
      ...advancedFields,
    };
    const create = HarvestCreateRequestSchema.parse({
      ...common,
      warehouseId: 2,
      productName: "Gạo Đài Thơm 8",
      lotCode: "LOT-GAO-DT8-2026A",
    });
    const update = HarvestUpdateRequestSchema.parse(common);

    expect(create.packagingType).toBe("BULK_BAG");
    expect(update.processingType).toBe("DRIED");
    expect(update.grossWetWeight).toBe(40000);
  });
});
