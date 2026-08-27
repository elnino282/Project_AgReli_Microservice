import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCertAuditsPage } from "./AdminCertAuditsPage";

const api = vi.hoisted(() => ({
  getAllAudits: vi.fn(),
  getCertificationApplications: vi.fn(),
  scheduleAudit: vi.fn(),
  startAudit: vi.fn(),
  completeAudit: vi.fn(),
  createNonconformity: vi.fn(),
  issueCertificate: vi.fn(),
}));

vi.mock("@/entities/farm/api/certificationApi", () => ({ certificationApi: api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const passedAudit = {
  id: 11,
  recordId: 7,
  farmId: 3,
  farmName: "Farm A",
  standardCode: "VIETGAP",
  complianceScore: 92.5,
  recordStatus: "AUDIT_PASSED",
  auditType: "INITIAL",
  scheduledDate: "2026-08-20",
  status: "PASSED",
  createdAt: "2026-08-20T00:00:00",
  nonconformities: [],
};

describe("AdminCertAuditsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAllAudits.mockResolvedValue([passedAudit]);
    api.getCertificationApplications.mockResolvedValue([]);
    api.scheduleAudit.mockResolvedValue({ id: 21 });
    api.issueCertificate.mockResolvedValue("ok");
  });

  it("uses persisted PASSED/AUDIT_PASSED state to issue a certificate", async () => {
    const user = userEvent.setup();
    render(<AdminCertAuditsPage />);

    expect(await screen.findByText("Farm A")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Chi tiết/i }));
    await user.type(screen.getByLabelText("Số chứng nhận"), "CERT-2026-001");
    await user.click(screen.getByRole("button", { name: /Cấp Chứng Nhận/i }));

    await waitFor(() => expect(api.issueCertificate).toHaveBeenCalledWith(3, expect.objectContaining({
      certificateNumber: "CERT-2026-001",
    })));
  });

  it("schedules an initial audit from an applied application", async () => {
    api.getCertificationApplications.mockResolvedValueOnce([{
      recordId: 8,
      farmId: 4,
      farmName: "Farm chờ đánh giá",
      complianceScore: 88,
      status: "APPLIED",
    }]);
    const user = userEvent.setup();
    render(<AdminCertAuditsPage />);

    expect(await screen.findByText(/Farm chờ đánh giá/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Tổ chức chứng nhận"), "Đơn vị VietGAP A");
    await user.click(screen.getByRole("button", { name: /Tiếp nhận & lên lịch/i }));

    await waitFor(() => expect(api.scheduleAudit).toHaveBeenCalledWith(4, expect.objectContaining({
      auditType: "INITIAL",
      auditorOrgName: "Đơn vị VietGAP A",
    })));
  });
});
