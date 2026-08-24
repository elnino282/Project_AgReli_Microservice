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
} from "lucide-react";
import { toast } from "sonner";
import {
  certificationApi,
  CertificationDetails,
  CertificationItemDetail,
} from "@/entities/farm/api/certificationApi";
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
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Dialog state
  const [editingItem, setEditingItem] = useState<CertificationItemDetail | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editEvidenceUrl, setEditEvidenceUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchCertificationDetails = async (showToast = false) => {
    if (!farmId) return;
    try {
      if (showToast) setLoading(true);
      const data = await certificationApi.getCertificationDetails(parseInt(farmId));
      setDetails(data);
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return { label: "Đang đánh giá", color: "text-amber-600 bg-amber-50 border-amber-200" };
      case "READY_TO_APPLY":
        return { label: "Đủ điều kiện nộp đơn", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
      case "APPLIED":
        return { label: "Đã nộp đơn - Chờ thẩm định", color: "text-blue-600 bg-blue-50 border-blue-200" };
      case "CERTIFIED":
        return { label: "Đã được chứng nhận VietGAP", color: "text-emerald-700 bg-emerald-100 border-emerald-300" };
      default:
        return { label: "Chưa kích hoạt", color: "text-slate-600 bg-slate-50 border-slate-200" };
    }
  };

  const statusInfo = getStatusInfo(details.status);

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
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                    {statusInfo.label}
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

              {details.complianceScore < 80 ? (
                <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-xs font-semibold border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5" /> Yêu cầu tối thiểu 80%
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
              {details.status === "APPLIED"
                ? "Đã gửi đơn đăng ký"
                : details.status === "CERTIFIED"
                ? "Nông trại đã đạt chứng nhận"
                : submitting
                ? "Đang xử lý..."
                : "Nộp Đơn Chứng Nhận VietGAP"}
            </Button>
            <p className="text-[10px] text-center text-slate-400">
              * Mọi thông tin sai lệch sẽ chịu trách nhiệm hoàn toàn trước pháp luật.
            </p>
          </div>
        </Card>
      </div>

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
