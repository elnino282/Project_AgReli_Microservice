import { useState, type ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetNonconformities,
  useCreateCorrectiveAction,
  useSubmitCorrectiveAction,
  useUpdateCorrectiveAction,
} from "@/entities/farm/api/generated/farm-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AsyncState } from "@/shared/ui/async-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/ui/dialog";
import { AlertCircle, FileText, CheckCircle2, ArrowLeft, Send, Pencil, UploadCloud, Save } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import httpClient from "@/shared/api/http";

export function NonconformityManagementPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const farmIdNumber = Number(farmId);
  const isValidFarmId = Number.isFinite(farmIdNumber) && farmIdNumber > 0;

  const { data: response, isLoading, error, refetch } = useGetNonconformities(
    farmIdNumber,
    { query: { enabled: isValidFarmId } }
  );

  const nonconformities = response?.data?.result ?? response?.data?.data ?? [];

  const createActionMutation = useCreateCorrectiveAction({
    mutation: {
      onSuccess: () => {
        toast.success("Đã lưu bản nháp kế hoạch khắc phục");
        queryClient.invalidateQueries({ queryKey: ["getNonconformities"] });
        refetch();
        setOpenDialog(false);
        setPlanDescription("");
        setEvidenceUrl("");
        setAppliesFromSeasonId("");
        setEditingActionId(null);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || "Không thể lưu kế hoạch khắc phục");
      }
    }
  });

  const updateActionMutation = useUpdateCorrectiveAction({
    mutation: {
      onSuccess: () => {
        toast.success("Đã cập nhật bản nháp khắc phục");
        queryClient.invalidateQueries({ queryKey: ["getNonconformities"] });
        refetch();
        setOpenDialog(false);
        setEditingActionId(null);
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || "Không thể cập nhật bản nháp"),
    },
  });

  const submitActionMutation = useSubmitCorrectiveAction({
    mutation: {
      onSuccess: () => {
        toast.success("Đã nộp kế hoạch và bằng chứng cho đơn vị đánh giá");
        queryClient.invalidateQueries({ queryKey: ["getNonconformities"] });
        refetch();
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || "Không thể nộp kế hoạch khắc phục"),
    },
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNcId, setSelectedNcId] = useState<number | null>(null);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [planDescription, setPlanDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [appliesFromSeasonId, setAppliesFromSeasonId] = useState("");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const handleOpenDialog = (id: number, action?: any) => {
    setSelectedNcId(id);
    setEditingActionId(action?.id ?? null);
    setPlanDescription(action?.planDescription ?? "");
    setEvidenceUrl(action?.evidenceUrls?.[0] ?? "");
    setAppliesFromSeasonId(action?.appliesFromSeasonId?.toString() ?? "");
    setOpenDialog(true);
  };

  const handleSaveDraft = () => {
    if (!selectedNcId || !planDescription) {
      toast.error("Vui lòng nhập phương án khắc phục");
      return;
    }
    const data = {
      planDescription,
      evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
      appliesFromSeasonId: appliesFromSeasonId ? Number(appliesFromSeasonId) : undefined,
    };
    if (editingActionId) {
      updateActionMutation.mutate({ actionId: editingActionId, data });
    } else {
      createActionMutation.mutate({ nonconformityId: selectedNcId, data });
    }
  };

  const handleEvidenceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Tệp minh chứng không được vượt quá 10MB");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploadingEvidence(true);
      const response = await httpClient.post<{ result: string }>(
        `/api/v1/farms/${farmIdNumber}/documents/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setEvidenceUrl(response.data.result);
      toast.success("Đã tải tệp minh chứng lên kho hồ sơ");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể tải tệp minh chứng");
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (!isValidFarmId) return <div className="p-4 text-destructive">Invalid Farm ID</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Lỗi & Khắc phục</h1>
          <p className="text-slate-500 text-sm">Xem và báo cáo khắc phục các lỗi được Auditor ghi nhận.</p>
        </div>
      </div>

      <AsyncState
        isLoading={isLoading}
        error={error as Error}
        onRetry={() => refetch()}
        isEmpty={nonconformities.length === 0}
        emptyTitle="Không có lỗi nào được ghi nhận"
        emptyDescription="Nông trại của bạn đang tuân thủ tốt các tiêu chuẩn VietGAP."
      >
        <div className="grid gap-4">
          {nonconformities.map((nc: any) => (
            <Card key={nc.id} className="border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-slate-800">Lỗi #{nc.id}</span>
                  <Badge variant="outline" className={
                    nc.severity === "CRITICAL" ? "bg-rose-100 text-rose-800 border-rose-200" :
                    nc.severity === "MAJOR" ? "bg-orange-100 text-orange-800 border-orange-200" :
                    "bg-amber-100 text-amber-800 border-amber-200"
                  }>
                    {nc.severity}
                  </Badge>
                  <Badge variant="outline" className={
                    nc.status === "RESOLVED" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                    "bg-slate-100 text-slate-800 border-slate-200"
                  }>
                    {nc.status}
                  </Badge>
                </div>
                <div className="text-sm text-slate-500">
                  Phát hiện ngày: {nc.createdAt ? new Date(nc.createdAt).toLocaleDateString("vi-VN") : "-"}
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">Mô tả lỗi:</h4>
                  <p className="text-slate-600 bg-white border border-slate-100 p-3 rounded-lg text-sm">{nc.description}</p>
                </div>

                {nc.correctiveActions && nc.correctiveActions.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lịch sử Khắc phục:
                    </h4>
                    {nc.correctiveActions.map((ca: any) => (
                      <div key={ca.id} className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-sm">
                        <div className="flex justify-between text-xs text-emerald-800 mb-2 font-medium">
                          <span>{ca.submittedAt ? `Đã nộp: ${new Date(ca.submittedAt).toLocaleDateString("vi-VN")}` : "Bản nháp – chưa nộp"}</span>
                          <span>Kết quả duyệt: {ca.reviewResult || (ca.submittedAt ? "Đang chờ" : "Chưa gửi")}</span>
                        </div>
                        <p className="text-slate-700"><strong>Phương án:</strong> {ca.planDescription}</p>
                        {ca.appliesFromSeasonId && (
                          <p className="mt-1 text-slate-600"><strong>Áp dụng từ mùa vụ:</strong> #{ca.appliesFromSeasonId}</p>
                        )}
                        {ca.evidenceUrls && ca.evidenceUrls.length > 0 && (
                          <div className="mt-2">
                            <strong>Minh chứng:</strong>
                            <a href={ca.evidenceUrls[0]} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">Xem tài liệu</a>
                          </div>
                        )}
                        {ca.reviewNote && (
                          <div className="mt-2 bg-white p-2 rounded border border-emerald-200/50">
                            <strong>Ghi chú Auditor:</strong> {ca.reviewNote}
                          </div>
                        )}
                        {!ca.submittedAt && (
                          <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-emerald-200 pt-3">
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(nc.id, ca)} className="gap-2">
                              <Pencil className="h-4 w-4" /> Sửa bản nháp
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => submitActionMutation.mutate({ actionId: ca.id })}
                              disabled={submitActionMutation.isPending}
                              className="gap-2 bg-emerald-700 hover:bg-emerald-800"
                            >
                              <Send className="h-4 w-4" /> Nộp đánh giá
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {nc.correctiveActions.some((ca: any) => ca.reviewResult === "REJECTED") && (
                      <div className="flex justify-end">
                        <Button onClick={() => handleOpenDialog(nc.id)} className="gap-2 bg-amber-600 hover:bg-amber-700">
                          <FileText className="h-4 w-4" /> Lập phương án khắc phục mới
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={() => handleOpenDialog(nc.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      <FileText className="w-4 h-4" /> Lập kế hoạch khắc phục
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </AsyncState>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActionId ? "Sửa kế hoạch khắc phục" : "Lập kế hoạch khắc phục"}</DialogTitle>
            <DialogDescription>
              Lưu nháp để tiếp tục chỉnh sửa. Khi đầy đủ phương án và minh chứng, dùng nút “Nộp đánh giá” ở danh sách.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phương án khắc phục <span className="text-rose-500">*</span></label>
              <Textarea 
                value={planDescription}
                onChange={e => setPlanDescription(e.target.value)}
                placeholder="Mô tả chi tiết những gì bạn đã làm để khắc phục lỗi này..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mùa vụ bắt đầu áp dụng</label>
              <Input
                type="number"
                min="1"
                value={appliesFromSeasonId}
                onChange={e => setAppliesFromSeasonId(e.target.value)}
                placeholder="ID mùa vụ hiện tại hoặc mùa vụ kế tiếp"
              />
              <p className="text-xs text-slate-500">Dùng khi biện pháp khắc phục chỉ có thể áp dụng từ mùa vụ sau.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tài liệu minh chứng</label>
              <Input 
                value={evidenceUrl}
                onChange={e => setEvidenceUrl(e.target.value)}
                placeholder="URL sẽ tự điền sau khi tải tệp"
              />
              <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
                <UploadCloud className="h-4 w-4" />
                {uploadingEvidence ? "Đang tải lên..." : "Chọn tệp ảnh/PDF minh chứng"}
                <input type="file" className="sr-only" accept="image/*,.pdf,.doc,.docx" onChange={handleEvidenceUpload} disabled={uploadingEvidence} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>Hủy</Button>
            <Button 
              onClick={handleSaveDraft}
              disabled={createActionMutation.isPending || updateActionMutation.isPending || uploadingEvidence || !planDescription}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {createActionMutation.isPending || updateActionMutation.isPending
                ? "Đang lưu..."
                : <><Save className="w-4 h-4" /> Lưu bản nháp</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
