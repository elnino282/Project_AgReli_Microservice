import { beforeEach, describe, expect, it, vi } from "vitest";
import httpClient from "@/shared/api/http";
import { seasonsApi } from "./seasonsApi";

vi.mock("@/shared/api/http", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("seasonsApi.getPesticideRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads persisted PHI records rather than generic field logs", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      data: {
        code: 200,
        result: [
          {
            id: 1,
            seasonId: 1,
            plotId: 1,
            pesticideName: "Amistar Top 325SC",
            phiDays: 14,
            harvestAllowedDate: "2026-07-15",
            applicationDate: "2026-07-01",
            createdBy: 3,
          },
        ],
      },
    });

    const records = await seasonsApi.getPesticideRecords(1);

    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/seasons/1/phi/records");
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ pesticideName: "Amistar Top 325SC", phiDays: 14 });
  });
});

describe("seasonsApi.searchSeasons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes the backend items pagination contract and filters the requested farm", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      data: {
        code: 200,
        result: {
          items: [
            { id: 1, farmId: 2, seasonName: "Vụ A" },
            { id: 2, farmId: 3, seasonName: "Vụ B" },
          ],
          page: 0,
          size: 100,
          totalElements: 2,
          totalPages: 1,
        },
      },
    });

    const page = await seasonsApi.searchSeasons({ farmId: 2, page: 0, size: 100 });

    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/seasons", {
      params: { page: 0, size: 100 },
    });
    expect(page.items).toEqual([{ id: 1, farmId: 2, seasonName: "Vụ A" }]);
    expect(page.totalElements).toBe(1);
  });

  it("returns a safe empty page when the payload has no item array", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      data: { code: 200, result: {} },
    });

    await expect(seasonsApi.searchSeasons({ farmId: 2, page: 0, size: 100 }))
      .resolves.toMatchObject({ items: [], totalElements: 0, totalPages: 0 });
  });
});
