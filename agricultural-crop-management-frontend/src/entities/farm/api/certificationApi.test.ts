import { beforeEach, describe, expect, it, vi } from "vitest";
import httpClient from "@/shared/api/http";
import { certificationApi } from "./certificationApi";

vi.mock("@/shared/api/http", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("certificationApi dossier contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps the persisted FarmDocumentResponse from the API envelope", async () => {
    const persistedDocument = {
      id: 34,
      farmId: 12,
      documentType: "OTHER",
      documentTypeLabel: "Khác",
      title: "Hồ sơ xuất tự động (Dossier)",
      fileUrl: "data:text/plain;base64,SG8gc28gVmlldEdBUA==",
      isExpired: false,
      isExpiringSoon: false,
      verificationStatus: "PENDING",
      createdAt: "2026-08-21T00:00:00",
      updatedAt: "2026-08-21T00:00:00",
    };
    vi.mocked(httpClient.post).mockResolvedValue({
      data: { code: "SUCCESS", result: persistedDocument },
    });

    const result = await certificationApi.exportDossier(12, [7, 8]);

    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/farms/12/certification/export-dossier",
      { seasonIds: [7, 8] },
    );
    expect(result).toEqual(persistedDocument);
  });
});
