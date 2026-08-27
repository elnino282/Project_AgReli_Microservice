import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  Upload,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Save,
  Check,
  Building,
  Download,
  ClipboardList,
  ShieldCheck,
  Clock3,
  Microscope,
  MapPin,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";
import {
  certificationApi,
  CertificationAudit,
  CertificationDetails,
  FarmDocumentResponse,
  CertificationItemDetail,
} from "@/entities/farm/api/certificationApi";
import { seasonsApi } from "@/entities/season/api/seasonsApi";
import type { Season } from "@/entities/season/model/types";
import {
  CERTIFICATION_STATUS_META,
  CERTIFICATION_WORKFLOW_STEPS,
  getWorkflowStepState,
} from "@/entities/farm/model/certificationWorkflow";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  PageContainer,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui";

export default function CertificationPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<CertificationDetails | null>(null);
  const [audits, setAudits] = useState<CertificationAudit[]>([]);
  const [documents, setDocuments] = useState<FarmDocumentResponse[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Dialog state
  const [editingItem, setEditingItem] = useState<CertificationItemDetail | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editEvidenceUrl, setEditEvidenceUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState<Season[]>([]);
  const [selectedScopeAreas, setSelectedScopeAreas] = useState<Record<number, string>>({});
  const [scopeLoading, setScopeLoading] = useState(false);

  const fetchCertificationDetails = async (showToast = false) => {
    if (!farmId) return;
    try {
      if (showToast) setLoading(true);
      const farmIdNumber = parseInt(farmId);
      const data = await certificationApi.getCertificationDetails(farmIdNumber);
      setDetails(data);
      const [auditResult, documentResult] = await Promise.allSettled([
        certificationApi.getFarmAudits(farmIdNumber),
        certificationApi.getFarmDocuments(farmIdNumber),
      ]);
      setAudits(auditResult.status === "fulfilled" ? auditResult.value : []);
      setDocuments(documentResult.status === "fulfilled" ? documentResult.value : []);
      if (showToast) toast.success("Đã đồng bộ dữ liệu VietGAP mới nhất.");
    } catch (error) {
      console.error("Failed to load certification details", error);
      toast.error("Không thể tải thông tin chứng nhận VietGAP.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificationDetails();
  }, [farmId]);

  const handleApply = async () => {
    if (!farmId) return;
    try {
      setSubmitting(true);
      await certificationApi.applyCertification(parseInt(farmId));
      toast.success("Đã nộp đơn xin chứng nhận VietGAP thành công!");
      fetchCertificationDetails();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Nộp đơn thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (item: CertificationItemDetail) => {
    setEditingItem(item);
    setEditStatus(item.status);
    setEditEvidenceUrl(item.evidenceUrl || "");
    setEditNotes(item.notes || "");
  };

  const handleUpdateItem = async () => {
    if (!farmId || !editingItem) return;
    try {
      setSubmitting(true);
      await certificationApi.updateItemStatus(parseInt(farmId), editingItem.id, {
        status: editStatus,
        evidenceUrl: editEvidenceUrl,
        notes: editNotes,
      });
      toast.success(`Cập nhật minh chứng cho ${editingItem.itemCode} thành công.`);
      setEditingItem(null);
      fetchCertificationDetails();
    } catch (error) {
      toast.error("Cập nhật thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportDossier = async () => {
    if (!farmId) return;
    try {
      setExporting(true);
      const dossierDocument = await certificationApi.exportDossier(parseInt(farmId));
      const fileUrl = dossierDocument.fileUrl?.trim();
      const isPersistedDocumentUrl = fileUrl != null && (
        fileUrl.startsWith("data:text/plain;base64,") ||
        fileUrl.startsWith("https://") ||
        fileUrl.startsWith("http://") ||
        (fileUrl.startsWith("/") && !fileUrl.startsWith("//"))
      );
      if (!isPersistedDocumentUrl) {
        throw new Error("Backend did not return a downloadable dossier URL");
      }

      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", `HoSoVietGAP_${farmId}_${dossierDocument.id}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Xuất hồ sơ thành công.");
    } catch (error) {
      toast.error("Không thể xuất hồ sơ.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Đang tải đánh giá tiêu chuẩn VietGAP...</p>
        </div>
      </PageContainer>
    );
  }

  if (!details) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Không tìm thấy thông tin đánh giá</h2>
          <Button className="min-h-[44px] mt-4" onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        </div>
      </PageContainer>
    );
  }

  // Group items by category for tabs
  const categories = ["all", ...new Set(details.items.map((item) => item.category))];

  const filteredItems = details.items.filter(
    (item) => activeTab === "all" || item.category === activeTab
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">ĐẠT (PASS)</Badge>;
      case "FAIL":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">KHÔNG ĐẠT (FAIL)</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">CHỜ ĐÁNH GIÁ</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">KHÔNG ÁP DỤNG</Badge>;
    }
  };

  const statusMeta = CERTIFICATION_STATUS_META[details.status] ?? {
    label: details.status,
    tone: "text-slate-600 bg-slate-50 border-slate-200",
  };

  const openScopeDialog = async () => {
    if (!farmId) return;
    setScopeLoading(true);
    try {
      const page = await seasonsApi.searchSeasons({
        farmId: Number(farmId), page: 0, size: 100,
      });
      setAvailableSeasons(Array.isArray(page.items) ? page.items : []);
      setSelectedScopeAreas(Object.fromEntries(
        (details?.scopes ?? []).map((scope) => [scope.seasonId, String(scope.registeredAreaHa)]),
      ));
      setScopeDialogOpen(true);
    } catch (error) {
      toast.error("Không thể tải danh sách mùa vụ để thiết lập phạm vi chứng nhận.");
    } finally {
      setScopeLoading(false);
    }
  };

  const handleSaveScopes = async () => {
    if (!farmId) return;
    const scopes = Object.entries(selectedScopeAreas)
      .filter(([, area]) => Number(area) > 0)
      .map(([seasonId, area]) => ({ seasonId: Number(seasonId), registeredAreaHa: Number(area) }));
    if (scopes.length === 0) {
      toast.error("Hãy chọn ít nhất một mùa vụ và nhập diện tích đăng ký.");
      return;
    }
    try {
      setSubmitting(true);
      await certificationApi.updateScopes(Number(farmId), scopes);
      toast.success("Đã lưu phạm vi sản phẩm và vùng sản xuất được đăng ký.");
      setScopeDialogOpen(false);
      await fetchCertificationDetails();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể cập nhật phạm vi chứng nhận.");
    } finally {
      setSubmitting(false);
    }
  };
  const mandatoryItems = details.items.filter((item) => item.isMandatory);
  const mandatoryPassed = mandatoryItems.filter((item) => item.status === "PASS").length;
  const latestAudit = [...audits].sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  )[0];
  const recommendedDocuments = [
    { type: "SOIL_TEST_REPORT", label: "Kết quả xét nghiệm đất" },
    { type: "WATER_TEST_REPORT", label: "Kết quả xét nghiệm nước" },
    { type: "INTERNAL_AUDIT", label: "Biên bản đánh giá nội bộ" },
  ].map((requirement) => ({
    ...requirement,
    document: documents.find((document) => document.documentType === requirement.type),
  }));

  const getApplicationButtonLabel = () => {
    if (submitting) return "Đang xử lý...";
    if (["IN_PROGRESS", "READY_TO_APPLY"].includes(details.status)) return "Nộp đơn chứng nhận VietGAP";
    if (details.status === "CERTIFIED") return "Đã được cấp chứng nhận";
    if (details.status === "PUBLISHED") return "Chứng nhận đã được công khai";
    return statusMeta.label;
  };

  // Circular progress helper
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (details.complianceScore / 100) * circumference;

  return (
    <PageContainer>
      {/* Back button & Action Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="min-h-[44px] flex items-center gap-2 transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách nông trại
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/farmer/farms/${farmId}/self-assessment`)}
            className="min-h-[44px] flex items-center gap-2 shadow-sm transition hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <ClipboardList className="w-4 h-4 text-blue-500" /> Tự đánh giá
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/farmer/farms/${farmId}/nonconformities`)}
            className="min-h-[44px] flex items-center gap-2 shadow-sm transition hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <AlertCircle className="w-4 h-4 text-amber-500" /> Quản lý lỗi
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/farmer/farm-documents?farmId=${farmId}`)}
            className="min-h-[44px] flex items-center gap-2 shadow-sm"
          >
            <FileText className="w-4 h-4 text-emerald-600" /> Hồ sơ nông trại
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDossier}
            disabled={exporting}
            className="min-h-[44px] flex items-center gap-2 shadow-sm transition hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <Download className="w-4 h-4" /> {exporting ? "Đang xuất..." : "Xuất hồ sơ"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCertificationDetails(true)}
            className="min-h-[44px] flex items-center gap-2 shadow-sm transition hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <RefreshCw className="w-4 h-4" /> Đồng bộ & Đánh giá lại
          </Button>
        </div>
      </div>

      {/* Main Header / Status Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <Award className="w-8 h-8 text-emerald-600" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{details.standardName}</h1>
                  <p className="text-slate-500 text-sm">Mã tiêu chuẩn: {details.standardCode}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-sm font-medium text-slate-600">Trạng thái hồ sơ:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.tone}`}>
                    {statusMeta.label}
                  </span>
                </div>
                {details.appliedAt && (
                  <p className="text-xs text-slate-500 flex items-center justify-center md:justify-start gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Ngày gửi đơn: {new Date(details.appliedAt).toLocaleDateString("vi-VN")}
                  </p>
                )}
                {details.certifiedAt && (
                  <p className="text-xs text-slate-500 flex items-center justify-center md:justify-start gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Ngày cấp: {new Date(details.certifiedAt).toLocaleDateString("vi-VN")} - Hết hạn: {details.expiryDate}
                  </p>
                )}
                {details.certificateNumber && (
                  <p className="text-xs text-slate-500">Số chứng nhận: <strong>{details.certificateNumber}</strong></p>
                )}
                {details.nextPeriodicReviewDate && (
                  <p className="text-xs text-slate-500 flex items-center justify-center md:justify-start gap-1">
                    <Clock3 className="w-3.5 h-3.5" /> Kiểm tra định kỳ tiếp theo: {new Date(details.nextPeriodicReviewDate).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>

              <p className="text-sm text-slate-600 max-w-md leading-relaxed">
                Hệ thống VietGAP Certification Engine tự động thu thập và kiểm tra dữ liệu từ các dịch vụ liên kết (ghi chép nhật ký phun thuốc BVTV, kết quả xét nghiệm mẫu đất, mẫu nước) để đánh giá hồ sơ.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="relative flex items-center justify-center">
                <svg className="w-36 h-36 transform -rotate-90">
                  {/* Background Circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-slate-100"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-emerald-500 transition-all duration-500 ease-out"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold text-slate-800">
                    {details.complianceScore.toFixed(0)}%
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    Điểm VietGAP
                  </span>
                </div>
              </div>

              {!details.isEligible ? (
                <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-xs font-semibold border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5" /> Chưa đủ điểm hoặc minh chứng bắt buộc
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                  <Check className="w-3.5 h-3.5" /> Đạt điều kiện nộp đơn
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Auditor Notes or Submit Action */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl flex flex-col justify-between p-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Đăng ký chứng nhận</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Khi đạt trên 80% tổng điểm và hoàn thành đầy đủ minh chứng bắt buộc, bạn có thể nộp đơn trực tiếp cho tổ chức chứng nhận thẩm định.
            </p>

            {details.auditorNotes && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl mb-4 text-xs text-amber-800">
                <span className="font-semibold block mb-1">Ghi chú từ kiểm dịch viên:</span>
                {details.auditorNotes}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              className={`w-full py-6 rounded-xl font-bold transition-all duration-300 shadow-md ${
                details.isEligible && ["IN_PROGRESS", "READY_TO_APPLY"].includes(details.status)
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
              disabled={!details.isEligible || !["IN_PROGRESS", "READY_TO_APPLY"].includes(details.status) || submitting}
              onClick={handleApply}
            >
              {getApplicationButtonLabel()}
            </Button>
            <p className="text-[10px] text-center text-slate-400">
              * Mọi thông tin sai lệch sẽ chịu trách nhiệm hoàn toàn trước pháp luật.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mb-6 border border-emerald-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-emerald-100 bg-emerald-50/70 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-emerald-700" /> Phạm vi được đăng ký chứng nhận
            </CardTitle>
            <CardDescription className="mt-1">
              VietGAP chỉ áp dụng cho đúng sản phẩm, mùa vụ, thửa đất và diện tích dưới đây; không áp dụng chung cho toàn bộ nông trại.
            </CardDescription>
          </div>
          {['IN_PROGRESS', 'READY_TO_APPLY'].includes(details.status) && (
            <Button variant="outline" disabled={scopeLoading} onClick={openScopeDialog}>
              {scopeLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
              Thiết lập phạm vi
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-5">
          {(details.scopes ?? []).length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {details.scopes.map((scope) => (
                <div key={scope.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <Sprout className="h-4 w-4 text-emerald-600" />
                      {scope.cropName}{scope.varietyName ? ` – ${scope.varietyName}` : ''}
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800">Trong phạm vi</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Thửa đất: <strong>{scope.plotName}</strong> (#{scope.plotId})</p>
                    <p>Mùa vụ: #{scope.seasonId}</p>
                    <p>Diện tích chứng nhận: <strong>{scope.registeredAreaHa} ha</strong></p>
                    <p>Sản lượng dự kiến: {scope.expectedYieldKg != null ? `${scope.expectedYieldKg.toLocaleString('vi-VN')} kg` : 'Chưa khai báo'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Chưa có sản phẩm hoặc vùng sản xuất nào trong phạm vi. Hồ sơ chưa được phép đăng ký dù checklist đạt 100%.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-emerald-700" /> Lộ trình chứng nhận của nông trại
          </CardTitle>
          <CardDescription>
            Trạng thái được cập nhật từ checklist, lịch đánh giá và kết quả xác minh thực tế trên hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {CERTIFICATION_WORKFLOW_STEPS.map((step, index) => {
              const state = getWorkflowStepState(index, details.status);
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border p-4 ${
                    state === "completed"
                      ? "border-emerald-200 bg-emerald-50/70"
                      : state === "current"
                        ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      state === "completed"
                        ? "bg-emerald-600 text-white"
                        : state === "current"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}>
                      {state === "completed" ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{step.label}</span>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">{step.description}</p>
                </div>
              );
            })}
          </div>
          {CERTIFICATION_STATUS_META[details.status]?.terminal && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Hồ sơ đang ở trạng thái <strong>{statusMeta.label}</strong>. Hãy xem ghi chú đánh giá và liên hệ đơn vị chứng nhận trước khi lập hồ sơ mới.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Khi nào nên đăng ký?</CardTitle>
            <CardDescription>Chỉ nộp khi cả hai điều kiện bắt buộc đều hoàn thành.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadinessRow
              passed={(details.scopes ?? []).length > 0}
              label={`${(details.scopes ?? []).length} phạm vi sản phẩm/thửa đất đã đăng ký`}
            />
            <ReadinessRow
              passed={details.complianceScore >= 80}
              label={`Điểm tuân thủ ≥ 80% (${details.complianceScore.toFixed(0)}%)`}
            />
            <ReadinessRow
              passed={details.missingMandatoryEvidenceCount === 0}
              label={`${mandatoryPassed}/${mandatoryItems.length} tiêu chí bắt buộc đã đạt`}
            />
            {details.missingMandatoryEvidenceCount > 0 && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Còn {details.missingMandatoryEvidenceCount} tiêu chí bắt buộc cần hoàn thiện. Mở bảng checklist bên dưới để xem chi tiết.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Bộ hồ sơ hỗ trợ</CardTitle>
            <CardDescription>Chuẩn bị trước khi đánh giá; trạng thái xác minh do Admin cập nhật.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendedDocuments.map(({ type, label, document }) => (
              <div key={type} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{label}</span>
                <Badge variant="outline" className={document ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}>
                  {document ? document.verificationStatus : "Chưa tải lên"}
                </Badge>
              </div>
            ))}
            <Button
              variant="outline"
              className="mt-2 w-full gap-2"
              onClick={() => navigate(`/farmer/farm-documents?farmId=${farmId}`)}
            >
              <Upload className="h-4 w-4" /> Quản lý hồ sơ nông trại
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Microscope className="h-5 w-5 text-indigo-600" /> Đánh giá gần nhất
            </CardTitle>
            <CardDescription>Phỏng vấn, lấy mẫu và điểm không phù hợp.</CardDescription>
          </CardHeader>
          <CardContent>
            {latestAudit ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Trạng thái</span><Badge variant="outline">{latestAudit.status}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Lịch đánh giá</span><span>{latestAudit.scheduledDate ? new Date(latestAudit.scheduledDate).toLocaleDateString("vi-VN") : "Chưa có"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Tổ chức</span><span className="text-right">{latestAudit.auditorOrgName || "Chưa phân công"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Điểm không phù hợp</span><span>{latestAudit.nonconformities?.length || 0}</span></div>
                {latestAudit.interviewNotes && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong>Phỏng vấn:</strong> {latestAudit.interviewNotes}</p>}
                {latestAudit.sampleCollectionNotes && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong>Lấy mẫu:</strong> {latestAudit.sampleCollectionNotes}</p>}
              </div>
            ) : (
              <div className="flex min-h-32 flex-col items-center justify-center text-center text-sm text-slate-500">
                <Clock3 className="mb-2 h-7 w-7 text-slate-300" />
                Chưa có lịch đánh giá từ tổ chức chứng nhận.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {details.status === "CERTIFIED" && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-emerald-900">Đã được cấp giấy – còn một bước trước khi công khai</p>
            <p className="text-sm text-emerald-800">Tải bản giấy chứng nhận lên Hồ sơ nông trại để Admin đối chiếu và duyệt public.</p>
          </div>
          <Button onClick={() => navigate(`/farmer/farm-documents?farmId=${farmId}&openUpload=1&type=CERTIFICATE`)} className="gap-2 bg-emerald-700 hover:bg-emerald-800">
            <Upload className="h-4 w-4" /> Tải giấy chứng nhận
          </Button>
        </div>
      )}

      {details.status === "PERIODIC_REVIEW_DUE" && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-orange-900">Đến hạn kiểm tra định kỳ</p>
            <p className="text-sm text-orange-800">Bổ sung biên bản kiểm tra để nhân viên và Admin tiếp tục đối chiếu hồ sơ.</p>
          </div>
          <Button onClick={() => navigate(`/farmer/farm-documents?farmId=${farmId}&openUpload=1&type=PERIODIC_INSPECTION`)} className="gap-2 bg-orange-700 hover:bg-orange-800">
            <Upload className="h-4 w-4" /> Tải biên bản định kỳ
          </Button>
        </div>
      )}

      {/* Checklist items table */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-5 px-6">
          <CardTitle className="text-lg font-bold text-slate-800">Danh mục đánh giá VietGAP</CardTitle>
          <CardDescription className="text-slate-500">
            Chi tiết các tiêu chí VietGAP bắt buộc và khuyến khích
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-slate-100 px-6 bg-slate-50/50">
              <TabsList className="w-full overflow-x-auto">
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                      activeTab === cat
                        ? "bg-white text-emerald-700 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {cat === "all" ? "Tất cả" : cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                    <TableHead className="w-24 text-left font-bold text-slate-600">Mã tiêu chí</TableHead>
                    <TableHead className="w-32 text-left font-bold text-slate-600">Phân loại</TableHead>
                    <TableHead className="text-left font-bold text-slate-600">Mô tả chi tiết</TableHead>
                    <TableHead className="w-28 text-center font-bold text-slate-600">Bắt buộc</TableHead>
                    <TableHead className="w-24 text-right font-bold text-slate-600">Trọng số (%)</TableHead>
                    <TableHead className="w-36 text-center font-bold text-slate-600">Kết quả</TableHead>
                    <TableHead className="w-28 text-center font-bold text-slate-600">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-mono text-sm text-slate-700">{item.itemCode}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold uppercase">
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="font-medium text-slate-800 text-sm">{item.description}</div>
                        {item.dataSourceType && (
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-400" /> Nguồn: {item.dataSourceType}{" "}
                            {item.dataSourceQuery && `(${item.dataSourceQuery})`}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-amber-700 mt-1 bg-amber-50/50 p-1.5 rounded border border-amber-100/50">
                            <strong>Ghi chú:</strong> {item.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.isMandatory ? (
                          <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            Bắt buộc
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Khuyến khích</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-700 font-medium">
                        {item.weightPct}%
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          onClick={() => handleEditClick(item)}
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" /> Minh chứng
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-700" />
              Thiết lập phạm vi xin chứng nhận
            </DialogTitle>
            <DialogDescription>
              Chọn đúng mùa vụ đại diện cho sản phẩm và thửa đất được đánh giá. Diện tích đăng ký không được vượt quá diện tích thửa đất.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {availableSeasons.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                Nông trại chưa có mùa vụ đủ thông tin cây trồng và thửa đất để đăng ký.
              </div>
            ) : availableSeasons.map((season) => {
              const selected = selectedScopeAreas[season.id] !== undefined;
              return (
                <div
                  key={season.id}
                  className={`grid gap-4 rounded-xl border p-4 md:grid-cols-[auto_1fr_180px] md:items-center ${selected ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200"}`}
                >
                  <input
                    aria-label={`Chọn ${season.seasonName}`}
                    type="checkbox"
                    className="h-5 w-5 accent-emerald-700"
                    checked={selected}
                    onChange={(event) => setSelectedScopeAreas((current) => {
                      const next = { ...current };
                      if (event.target.checked) next[season.id] = next[season.id] || "1";
                      else delete next[season.id];
                      return next;
                    })}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{season.seasonName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {season.cropName || `Cây trồng #${season.cropId}`}
                      {season.varietyName ? ` · ${season.varietyName}` : ""}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span>Thửa đất: {season.plotName || `#${season.plotId}`}</span>
                      <span>Sản lượng dự kiến: {season.expectedYieldKg?.toLocaleString("vi-VN") ?? "Chưa khai báo"} kg</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`scope-area-${season.id}`}>Diện tích đăng ký (ha)</Label>
                    <Input
                      id={`scope-area-${season.id}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      disabled={!selected}
                      value={selectedScopeAreas[season.id] ?? ""}
                      onChange={(event) => setSelectedScopeAreas((current) => ({
                        ...current,
                        [season.id]: event.target.value,
                      }))}
                      placeholder="Ví dụ: 5"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Sau khi nộp hồ sơ, phạm vi bị khóa để đảm bảo hồ sơ đánh giá không bị thay đổi. Muốn mở rộng sản phẩm hoặc thửa đất cần thực hiện đánh giá bổ sung theo quy trình chứng nhận.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setScopeDialogOpen(false)}>Hủy</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={submitting} onClick={handleSaveScopes}>
              <Save className="mr-2 h-4 w-4" /> {submitting ? "Đang lưu..." : "Lưu phạm vi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Evidence Dialog */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              Cập nhật minh chứng VietGAP
            </DialogTitle>
            <DialogDescription>
              Cập nhật kết quả tự đánh giá và tài liệu đính kèm cho tiêu chí {editingItem?.itemCode}.
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                <span className="font-semibold text-slate-700">Tiêu chí: </span>
                {editingItem.description}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái đánh giá</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="PENDING">PENDING (Chờ đánh giá)</option>
                  <option value="PASS">PASS (Đạt tiêu chuẩn)</option>
                  <option value="FAIL">FAIL (Không đạt tiêu chuẩn)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidence">Đường dẫn tài liệu minh chứng (URL)</Label>
                <Input
                  id="evidence"
                  placeholder="https://example.com/certificate.pdf"
                  value={editEvidenceUrl}
                  onChange={(e) => setEditEvidenceUrl(e.target.value)}
                  className="focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú & Nhận xét</Label>
                <Textarea
                  id="notes"
                  placeholder="Nhập ghi chú chi tiết hoặc bằng chứng đạt..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="min-h-[44px]" onClick={() => setEditingItem(null)}>
              Hủy
            </Button>
            <Button
              className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
              onClick={handleUpdateItem}
              disabled={submitting}
            >
              <Save className="w-4 h-4" /> {submitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function ReadinessRow({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm">
      {passed ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
      )}
      <span className={passed ? "text-slate-700" : "text-slate-600"}>{label}</span>
    </div>
  );
}
