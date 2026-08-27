import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CertificationPage from "./CertificationPage";

const api = vi.hoisted(() => ({
  getCertificationDetails: vi.fn(),
  getFarmAudits: vi.fn(),
  getFarmDocuments: vi.fn(),
  exportDossier: vi.fn(),
}));
const seasonApi = vi.hoisted(() => ({ searchSeasons: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/entities/farm/api/certificationApi", () => ({ certificationApi: api }));
vi.mock("@/entities/season/api/seasonsApi", () => ({ seasonsApi: seasonApi }));
vi.mock("sonner", () => ({ toast }));

describe("CertificationPage dossier export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCertificationDetails.mockResolvedValue({
      recordId: 1,
      farmId: 12,
      standardCode: "VIETGAP",
      standardName: "VietGAP",
      complianceScore: 90,
      status: "READY_TO_APPLY",
      items: [],
      isEligible: true,
      missingMandatoryEvidenceCount: 0,
      missingEvidenceItems: [],
    });
    api.getFarmAudits.mockResolvedValue([]);
    api.getFarmDocuments.mockResolvedValue([]);
    seasonApi.searchSeasons.mockResolvedValue({
      items: [],
      page: 0,
      size: 100,
      totalElements: 0,
      totalPages: 0,
    });
    api.exportDossier.mockResolvedValue({
      id: 34,
      farmId: 12,
      documentType: "EXPORTED_DOSSIER",
      documentTypeLabel: "Khác",
      title: "Hồ sơ xuất tự động (Dossier)",
      description: "Tổng hợp đánh giá VietGAP và nhật ký sản xuất",
      fileUrl: "data:text/plain;base64,SG8gc28gVmlldEdBUA==",
      issuedDate: "2026-08-21",
      isExpired: false,
      isExpiringSoon: false,
      verificationStatus: "PENDING",
      createdAt: "2026-08-21T00:00:00",
      updatedAt: "2026-08-21T00:00:00",
    });
  });

  it("downloads the persisted text document instead of serializing the response as a fake ZIP", async () => {
    const user = userEvent.setup();
    let clickedHref = "";
    let clickedFilename = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clickedHref = this.href;
      clickedFilename = this.download;
    });

    render(
      <MemoryRouter initialEntries={["/farmer/farms/12/certification"]}>
        <Routes>
          <Route path="/farmer/farms/:farmId/certification" element={<CertificationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Xuất hồ sơ/i }));

    await waitFor(() => {
      expect(clickedHref).toBe("data:text/plain;base64,SG8gc28gVmlldEdBUA==");
      expect(clickedFilename).toBe("HoSoVietGAP_12_34.txt");
      expect(screen.getByRole("button", { name: /Xuất hồ sơ/i })).toBeEnabled();
    });
  });

  it("does not report success when the backend omits the downloadable URL", async () => {
    api.exportDossier.mockResolvedValueOnce({
      id: 35,
      farmId: 12,
      fileUrl: undefined,
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/farmer/farms/12/certification"]}>
        <Routes>
          <Route path="/farmer/farms/:farmId/certification" element={<CertificationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Xuất hồ sơ/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Không thể xuất hồ sơ.");
      expect(toast.success).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /Xuất hồ sơ/i })).toBeEnabled();
    });
  });

  it("opens scope setup with the backend items pagination contract", async () => {
    seasonApi.searchSeasons.mockResolvedValueOnce({
      items: [{
        id: 7,
        farmId: 12,
        plotId: 4,
        plotName: "Lô A1",
        cropId: 3,
        cropName: "Lúa",
        varietyId: 5,
        varietyName: "Đài Thơm 8",
        seasonName: "Vụ Hè Thu 2026",
        startDate: "2026-04-20",
        expectedYieldKg: 34500,
      }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/farmer/farms/12/certification"]}>
        <Routes>
          <Route path="/farmer/farms/:farmId/certification" element={<CertificationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Thiết lập phạm vi/i }));

    expect(await screen.findByText("Vụ Hè Thu 2026")).toBeInTheDocument();
    expect(seasonApi.searchSeasons).toHaveBeenCalledWith({ farmId: 12, page: 0, size: 100 });
  });
});
