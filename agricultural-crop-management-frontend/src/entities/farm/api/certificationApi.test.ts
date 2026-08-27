import { beforeEach, describe, expect, it, vi } from "vitest";
import httpClient from "@/shared/api/http";
import { certificationApi } from "./certificationApi";

vi.mock("@/shared/api/http", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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
      documentType: "EXPORTED_DOSSIER",
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

  it("loads farmer audits and documents from farm-scoped endpoints", async () => {
    vi.mocked(httpClient.get)
      .mockResolvedValueOnce({ data: { code: "SUCCESS", result: [{ id: 4 }] } })
      .mockResolvedValueOnce({ data: { code: "SUCCESS", result: [{ id: 9 }] } });

    await expect(certificationApi.getFarmAudits(12)).resolves.toEqual([{ id: 4 }]);
    await expect(certificationApi.getFarmDocuments(12)).resolves.toEqual([{ id: 9 }]);
    expect(httpClient.get).toHaveBeenNthCalledWith(1, "/api/v1/farms/12/certification/audits");
    expect(httpClient.get).toHaveBeenNthCalledWith(2, "/api/v1/farms/12/documents");
  });

  it("loads applications and schedules an audit through persisted endpoints", async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { code: "SUCCESS", result: [{ recordId: 2 }] } });
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { code: "SUCCESS", result: { id: 7 } } });

    await expect(certificationApi.getCertificationApplications()).resolves.toEqual([{ recordId: 2 }]);
    await expect(certificationApi.scheduleAudit(12, {
      auditType: "INITIAL",
      scheduledDate: "2026-09-01",
      auditorOrgName: "Tổ chức chứng nhận A",
    })).resolves.toEqual({ id: 7 });
    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/admin/certification-applications");
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/farms/12/certification/audits", {
      auditType: "INITIAL",
      scheduledDate: "2026-09-01",
      auditorOrgName: "Tổ chức chứng nhận A",
    });
  });

  it("persists product and plot scopes before certification application", async () => {
    const scopes = [{
      id: 1,
      seasonId: 7,
      plotId: 3,
      plotName: "Lo A1",
      cropId: 2,
      cropName: "Lua",
      registeredAreaHa: 5,
    }];
    vi.mocked(httpClient.put).mockResolvedValueOnce({ data: { code: "SUCCESS", result: scopes } });

    await expect(certificationApi.updateScopes(12, [
      { seasonId: 7, registeredAreaHa: 5 },
    ])).resolves.toEqual(scopes);
    expect(httpClient.put).toHaveBeenCalledWith(
      "/api/v1/farms/12/certification/scope",
      { scopes: [{ seasonId: 7, registeredAreaHa: 5 }] },
    );
  });
});
