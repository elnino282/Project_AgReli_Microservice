import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CertificationPage from "./CertificationPage";

const api = vi.hoisted(() => ({
  getCertificationDetails: vi.fn(),
  exportDossier: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/entities/farm/api/certificationApi", () => ({ certificationApi: api }));
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
    });
    api.exportDossier.mockResolvedValue({
      id: 34,
      farmId: 12,
      documentType: "OTHER",
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
});
