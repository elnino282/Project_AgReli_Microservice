import type { CertificationRecordStatus } from "../api/certificationApi";

export interface CertificationWorkflowStep {
  id: string;
  label: string;
  description: string;
  statuses: CertificationRecordStatus[];
}

export const CERTIFICATION_WORKFLOW_STEPS: CertificationWorkflowStep[] = [
  {
    id: "prepare",
    label: "Chuẩn bị & tự đánh giá",
    description: "Hoàn thiện checklist, nhật ký và minh chứng bắt buộc.",
    statuses: ["IN_PROGRESS", "READY_TO_APPLY"],
  },
  {
    id: "apply",
    label: "Đã đăng ký",
    description: "Hồ sơ đã gửi và chờ tổ chức chứng nhận tiếp nhận.",
    statuses: ["APPLIED"],
  },
  {
    id: "audit",
    label: "Đánh giá bên ngoài",
    description: "Kiểm tra hồ sơ, phỏng vấn, hiện trường và lấy mẫu.",
    statuses: ["AUDIT_SCHEDULED", "AUDIT_IN_PROGRESS"],
  },
  {
    id: "correct",
    label: "Khắc phục",
    description: "Lập kế hoạch, bổ sung bằng chứng và gửi lại để đánh giá.",
    statuses: ["NONCONFORMITY_FOUND", "CORRECTIVE_ACTION_SUBMITTED"],
  },
  {
    id: "pass",
    label: "Đạt đánh giá",
    description: "Các điểm không phù hợp đã được đóng và hồ sơ đạt đánh giá.",
    statuses: ["AUDIT_PASSED"],
  },
  {
    id: "certificate",
    label: "Được cấp giấy",
    description: "Chứng nhận đã được cấp; farmer tải bản giấy lên hệ thống.",
    statuses: ["CERTIFIED"],
  },
  {
    id: "publish",
    label: "Đã xác minh & công khai",
    description: "Admin đã đối chiếu giấy chứng nhận trước khi public.",
    statuses: ["PUBLISHED"],
  },
  {
    id: "periodic",
    label: "Giám sát định kỳ",
    description: "Theo dõi hạn và bổ sung biên bản kiểm tra định kỳ.",
    statuses: ["PERIODIC_REVIEW_DUE"],
  },
];

export const CERTIFICATION_STATUS_META: Record<
  CertificationRecordStatus,
  { label: string; tone: string; terminal?: boolean }
> = {
  IN_PROGRESS: { label: "Đang chuẩn bị hồ sơ", tone: "text-amber-700 bg-amber-50 border-amber-200" },
  READY_TO_APPLY: { label: "Đủ điều kiện đăng ký", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  APPLIED: { label: "Đã đăng ký – chờ tiếp nhận", tone: "text-blue-700 bg-blue-50 border-blue-200" },
  AUDIT_SCHEDULED: { label: "Đã lên lịch đánh giá", tone: "text-blue-700 bg-blue-50 border-blue-200" },
  AUDIT_IN_PROGRESS: { label: "Đang được đánh giá", tone: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  NONCONFORMITY_FOUND: { label: "Cần khắc phục điểm không phù hợp", tone: "text-rose-700 bg-rose-50 border-rose-200" },
  CORRECTIVE_ACTION_SUBMITTED: { label: "Đã nộp khắc phục – chờ duyệt", tone: "text-amber-700 bg-amber-50 border-amber-200" },
  AUDIT_PASSED: { label: "Đạt đánh giá – chờ cấp giấy", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  CERTIFIED: { label: "Đã được cấp chứng nhận", tone: "text-emerald-800 bg-emerald-100 border-emerald-300" },
  PUBLISHED: { label: "Đã xác minh và công khai", tone: "text-emerald-800 bg-emerald-100 border-emerald-300" },
  PERIODIC_REVIEW_DUE: { label: "Đến hạn kiểm tra định kỳ", tone: "text-orange-700 bg-orange-50 border-orange-200" },
  EXPIRED: { label: "Chứng nhận đã hết hạn", tone: "text-slate-700 bg-slate-100 border-slate-300", terminal: true },
  REVOKED: { label: "Chứng nhận đã bị thu hồi", tone: "text-rose-800 bg-rose-100 border-rose-300", terminal: true },
  REJECTED: { label: "Hồ sơ bị từ chối", tone: "text-rose-800 bg-rose-100 border-rose-300", terminal: true },
};

const TERMINAL_STEP_INDEX: Partial<Record<CertificationRecordStatus, number>> = {
  REJECTED: 1,
  EXPIRED: 6,
  REVOKED: 6,
};

export function getWorkflowStepIndex(status: CertificationRecordStatus): number {
  const regularIndex = CERTIFICATION_WORKFLOW_STEPS.findIndex((step) => step.statuses.includes(status));
  return regularIndex >= 0 ? regularIndex : TERMINAL_STEP_INDEX[status] ?? 0;
}

export function getWorkflowStepState(
  stepIndex: number,
  status: CertificationRecordStatus,
): "completed" | "current" | "upcoming" {
  const currentIndex = getWorkflowStepIndex(status);
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}
