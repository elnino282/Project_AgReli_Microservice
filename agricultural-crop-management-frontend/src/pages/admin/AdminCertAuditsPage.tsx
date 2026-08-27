import { useEffect, useState } from "react";
import {
  certificationApi,
  type CertificationApplication,
  type CertificationAudit,
} from "@/entities/farm/api/certificationApi";
import { PageContainer } from "@/shared/ui";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Textarea } from "@/shared/ui/textarea";
import { AlertCircle, ArrowLeft, CalendarPlus, CheckCircle2, ClipboardCheck, Play, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);
const nextYear = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

const errorMessage = (error: unknown, fallback: string) => {
  const candidate = error as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message || fallback;
};

const statusClass = (status: string) => {
  if (status === "PASSED") return "bg-emerald-100 text-emerald-800";
  if (status === "FAILED") return "bg-rose-100 text-rose-800";
  if (status === "IN_PROGRESS") return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
};

export function AdminCertAuditsPage() {
  const [audits, setAudits] = useState<CertificationAudit[]>([]);
  const [applications, setApplications] = useState<CertificationApplication[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<CertificationAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ncDescription, setNcDescription] = useState("");
  const [ncSeverity, setNcSeverity] = useState<"MINOR" | "MAJOR" | "CRITICAL">("MAJOR");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [issuedDate, setIssuedDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState(nextYear);
  const [scheduleFarmId, setScheduleFarmId] = useState("");
  const [scheduleDate, setScheduleDate] = useState(today);
  const [auditorOrgName, setAuditorOrgName] = useState("");

  const fetchAudits = async (selectedId?: number) => {
    try {
      setLoading(true);
      const data = await certificationApi.getAllAudits();
      setAudits(data);
      if (selectedId !== undefined) setSelectedAudit(data.find((audit) => audit.id === selectedId) ?? null);
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tải danh sách audit"));
      setAudits([]);
      if (selectedId !== undefined) setSelectedAudit(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const data = await certificationApi.getCertificationApplications();
      setApplications(data);
      const actionable = data.filter((application) => ["APPLIED", "PERIODIC_REVIEW_DUE"].includes(application.status));
      setScheduleFarmId((current) => current || actionable[0]?.farmId.toString() || "");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tải hàng đợi hồ sơ chứng nhận"));
      setApplications([]);
    }
  };

  useEffect(() => {
    void fetchAudits();
    void fetchApplications();
  }, []);

  const runAuditAction = async (action: () => Promise<unknown>, success: string) => {
    if (!selectedAudit) return;
    try {
      setSubmitting(true);
      await action();
      toast.success(success);
      await fetchAudits(selectedAudit.id);
    } catch (error) {
      toast.error(errorMessage(error, "Không thể hoàn tất thao tác"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNonconformity = async () => {
    const description = ncDescription.trim();
    if (!selectedAudit || !description) {
      toast.error("Vui lòng nhập mô tả lỗi");
      return;
    }
    await runAuditAction(
      () => certificationApi.createNonconformity(selectedAudit.id, { severity: ncSeverity, description }),
      "Đã ghi nhận lỗi không phù hợp",
    );
    setNcDescription("");
  };

  const handleIssueCertificate = async () => {
    if (!selectedAudit?.farmId || !certificateNumber.trim()) {
      toast.error("Vui lòng nhập số chứng nhận và xác minh Farm ID");
      return;
    }
    await runAuditAction(
      () => certificationApi.issueCertificate(selectedAudit.farmId!, {
        certificateNumber: certificateNumber.trim(), issuedDate, expiryDate,
      }),
      "Cấp chứng nhận thành công",
    );
  };

  const handleScheduleAudit = async () => {
    const farmId = Number(scheduleFarmId);
    const application = applications.find((item) => item.farmId === farmId);
    if (!application || !scheduleDate || !auditorOrgName.trim()) {
      toast.error("Vui lòng chọn hồ sơ, ngày đánh giá và tổ chức chứng nhận");
      return;
    }
    try {
      setSubmitting(true);
      await certificationApi.scheduleAudit(farmId, {
        auditType: application.status === "PERIODIC_REVIEW_DUE" ? "PERIODIC" : "INITIAL",
        scheduledDate: scheduleDate,
        auditorOrgName: auditorOrgName.trim(),
      });
      toast.success("Đã tiếp nhận và lên lịch đánh giá");
      await Promise.all([fetchAudits(), fetchApplications()]);
      setAuditorOrgName("");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể lên lịch đánh giá"));
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedAudit) {
    const nonconformities = selectedAudit.nonconformities ?? [];
    return (
      <PageContainer>
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedAudit(null)}><ArrowLeft className="mr-2 h-4 w-4" /> Quay lại</Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Chi tiết Audit #{selectedAudit.id}</h1>
            <p className="text-sm text-slate-500">Nông trại: {selectedAudit.farmName ?? `Farm #${selectedAudit.farmId}`}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <Card>
              <CardHeader><CardTitle>Trạng thái đánh giá</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div><span className="text-slate-500">Loại audit:</span> {selectedAudit.auditType}</div>
                <div><span className="text-slate-500">Tiêu chuẩn:</span> {selectedAudit.standardCode ?? "Chưa xác định"}</div>
                <div><span className="text-slate-500">Ngày dự kiến:</span> {selectedAudit.scheduledDate ? new Date(selectedAudit.scheduledDate).toLocaleDateString("vi-VN") : "-"}</div>
                <div><span className="text-slate-500">Điểm tuân thủ:</span> {selectedAudit.complianceScore ?? "-"}%</div>
                <div className="sm:col-span-2"><span className="text-slate-500">Trạng thái hồ sơ:</span> {selectedAudit.recordStatus ?? "-"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Lỗi đã ghi nhận</CardTitle></CardHeader>
              <CardContent>
                {nonconformities.length > 0 ? <div className="space-y-4">
                  {nonconformities.map((nc) => <div key={nc.id} className="flex items-start justify-between rounded-lg border p-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-semibold">Lỗi #{nc.id}</span>
                        <Badge variant="outline" className="bg-rose-100 text-rose-800">{nc.severity}</Badge>
                        <Badge variant="outline">{nc.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{nc.description}</p>
                    </div>
                  </div>)}
                </div> : <p className="text-sm text-slate-500">Không có lỗi nào được ghi nhận.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {selectedAudit.status === "IN_PROGRESS" && <Card>
              <CardHeader><CardTitle>Ghi nhận lỗi mới</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <select aria-label="Mức độ lỗi" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={ncSeverity} onChange={(event) => setNcSeverity(event.target.value as typeof ncSeverity)}>
                  <option value="MINOR">MINOR</option><option value="MAJOR">MAJOR</option><option value="CRITICAL">CRITICAL</option>
                </select>
                <Textarea placeholder="Mô tả chi tiết lỗi..." value={ncDescription} onChange={(event) => setNcDescription(event.target.value)} />
                <Button className="w-full" disabled={submitting} onClick={handleAddNonconformity}>Tạo Non-Conformity</Button>
              </CardContent>
            </Card>}

            <Card>
              <CardHeader><CardTitle>Hành động theo trạng thái</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {selectedAudit.status === "SCHEDULED" && <Button className="w-full" disabled={submitting} onClick={() => runAuditAction(
                  () => certificationApi.startAudit(selectedAudit.id), "Đã bắt đầu audit",
                )}><Play className="mr-2 h-4 w-4" /> Bắt đầu Audit</Button>}
                {selectedAudit.status === "IN_PROGRESS" && <>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting} onClick={() => runAuditAction(
                    () => certificationApi.completeAudit(selectedAudit.id, { result: "PASSED" }), "Đã kết luận audit đạt",
                  )}><CheckCircle2 className="mr-2 h-4 w-4" /> Kết luận Đạt</Button>
                  <Button variant="destructive" className="w-full" disabled={submitting || nonconformities.length === 0} onClick={() => runAuditAction(
                    () => certificationApi.completeAudit(selectedAudit.id, { result: "FAILED" }), "Đã kết luận audit không đạt",
                  )}><XCircle className="mr-2 h-4 w-4" /> Kết luận Không đạt</Button>
                </>}
                {selectedAudit.status === "PASSED" && selectedAudit.recordStatus === "AUDIT_PASSED" && <>
                  <Input aria-label="Số chứng nhận" placeholder="Số chứng nhận" value={certificateNumber} onChange={(event) => setCertificateNumber(event.target.value)} />
                  <Input aria-label="Ngày cấp" type="date" value={issuedDate} onChange={(event) => setIssuedDate(event.target.value)} />
                  <Input aria-label="Ngày hết hạn" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting} onClick={handleIssueCertificate}><CheckCircle2 className="mr-2 h-4 w-4" /> Cấp Chứng Nhận</Button>
                </>}
                {!["SCHEDULED", "IN_PROGRESS"].includes(selectedAudit.status) && !(selectedAudit.status === "PASSED" && selectedAudit.recordStatus === "AUDIT_PASSED") &&
                  <p className="text-sm text-slate-500">Không có hành động hợp lệ cho trạng thái hiện tại.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    );
  }

  return <PageContainer>
    <div className="mb-6 flex items-center justify-between">
      <div><h1 className="text-2xl font-bold text-slate-800">Quản lý Audit</h1><p className="text-sm text-slate-500">Theo dõi vòng đời đánh giá và cấp chứng nhận VietGAP.</p></div>
      <Button onClick={() => void Promise.all([fetchAudits(), fetchApplications()])} variant="outline" className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới</Button>
    </div>
    {applications.some((application) => ["APPLIED", "PERIODIC_REVIEW_DUE"].includes(application.status)) && (
      <Card className="mb-6 border border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><CalendarPlus className="h-5 w-5 text-blue-700" /> Hồ sơ chờ tiếp nhận và lên lịch</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="schedule-application">Hồ sơ sản phẩm / vùng sản xuất</label>
            <select id="schedule-application" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={scheduleFarmId} onChange={(event) => setScheduleFarmId(event.target.value)}>
              {applications.filter((application) => ["APPLIED", "PERIODIC_REVIEW_DUE"].includes(application.status)).map((application) => (
                <option key={application.recordId} value={application.farmId}>
                  {application.farmName || `Farm #${application.farmId}`} – {(application.scopes ?? []).map((scope) => `${scope.cropName}/${scope.plotName}`).join(", ") || "Chưa có phạm vi"} – {application.status} – {application.complianceScore ?? 0}%
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="schedule-date">Ngày đánh giá</label>
            <Input id="schedule-date" type="date" min={today()} value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="auditor-org">Tổ chức chứng nhận</label>
            <Input id="auditor-org" placeholder="Tên tổ chức đánh giá" value={auditorOrgName} onChange={(event) => setAuditorOrgName(event.target.value)} />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button disabled={submitting} onClick={handleScheduleAudit} className="gap-2 bg-blue-700 hover:bg-blue-800"><CalendarPlus className="h-4 w-4" /> Tiếp nhận & lên lịch</Button>
          </div>
        </CardContent>
      </Card>
    )}
    <Card className="overflow-hidden rounded-xl border border-slate-200 shadow-sm"><Table>
      <TableHeader className="bg-slate-50"><TableRow>
        <TableHead>Mã Audit</TableHead><TableHead>Nông trại</TableHead><TableHead>Tiêu chuẩn</TableHead><TableHead>Ngày Audit</TableHead><TableHead>Điểm số</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Hành động</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {audits.map((audit) => <TableRow key={audit.id}>
          <TableCell className="font-mono text-sm">#{audit.id}</TableCell><TableCell className="font-semibold">{audit.farmName ?? `Farm #${audit.farmId}`}</TableCell>
          <TableCell><Badge variant="outline">{audit.standardCode ?? "-"}</Badge></TableCell><TableCell>{audit.scheduledDate ? new Date(audit.scheduledDate).toLocaleDateString("vi-VN") : "-"}</TableCell>
          <TableCell>{audit.complianceScore ?? "-"}%</TableCell><TableCell><Badge className={statusClass(audit.status)}>{audit.status}</Badge></TableCell>
          <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setSelectedAudit(audit)}><ClipboardCheck className="mr-1 h-4 w-4" /> Chi tiết</Button></TableCell>
        </TableRow>)}
        {audits.length === 0 && !loading && <TableRow><TableCell colSpan={7} className="py-8 text-center text-slate-500">Không có dữ liệu Audit.</TableCell></TableRow>}
      </TableBody>
    </Table></Card>
  </PageContainer>;
}
