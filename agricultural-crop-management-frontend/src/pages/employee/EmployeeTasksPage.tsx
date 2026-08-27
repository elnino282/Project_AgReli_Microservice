import {
  useEmployeeAcceptTask,
  useEmployeeReportTaskProgress,
  useEmployeeSeasonPlan,
  useEmployeeTasks,
  isSupportedEvidenceUrl,
} from "@/entities/labor";
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/shared/ui";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// [FIX] XÓA TOÀN BỘ IMPORTS TỪ REACT-LEAFLET VÀ CSS LEAFLET
import { MapPin, Clock, Calendar, CheckCircle2 } from "lucide-react";

const getTaskStatusClassName = (status?: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "OVERDUE":
      return "bg-red-100 text-red-700 border-red-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
};

export function EmployeeTasksPage() {
  const { t } = useI18n();
  const { data: taskPageData, isLoading, isError, error } = useEmployeeTasks({ page: 0, size: 200 });
  const [progressTaskId, setProgressTaskId] = useState<number | null>(null);
  const [planSeasonId, setPlanSeasonId] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<string>("0");
  const [progressNote, setProgressNote] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  
  // [FIX] XÓA STATE mapGeoData GÂY CRASH

  const tasks = taskPageData?.items ?? [];
  const tasksBySeason = useMemo(() => {
    const grouped = new Map<
      string,
      { seasonId: number | null; seasonName: string; tasks: typeof tasks }
    >();
    tasks.forEach((task) => {
      const seasonId = task.seasonId ?? null;
      const key = seasonId ? String(seasonId) : "no-season";
      const seasonName = task.seasonName || t("employee.common.unassignedSeason");
      const existing = grouped.get(key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        grouped.set(key, { seasonId, seasonName, tasks: [task] });
      }
    });
    return Array.from(grouped.values()).sort((a, b) =>
      a.seasonName.localeCompare(b.seasonName)
    );
  }, [tasks, t]);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.taskId === progressTaskId) ?? null,
    [progressTaskId, tasks]
  );
  const selectedPlanSeasonName = useMemo(
    () =>
      tasksBySeason.find((group) => group.seasonId === planSeasonId)?.seasonName
      ?? (planSeasonId ? t("employee.common.seasonFallback", { id: planSeasonId }) : ""),
    [planSeasonId, tasksBySeason, t]
  );
  const { data: seasonPlanTasks, isLoading: isSeasonPlanLoading } = useEmployeeSeasonPlan(planSeasonId);

  const acceptTaskMutation = useEmployeeAcceptTask({
    onSuccess: () => toast.success(t("employee.tasks.toast.acceptSuccess")),
    onError: (error) => toast.error(error.message || t("employee.tasks.toast.acceptError")),
  });

  const reportProgressMutation = useEmployeeReportTaskProgress({
    onSuccess: () => {
      toast.success(t("employee.tasks.toast.progressSuccess"));
      setProgressTaskId(null);
      setProgressPercent("0");
      setProgressNote("");
      setEvidenceUrl("");
    },
    onError: (error) => toast.error(error.message || t("employee.tasks.toast.progressError")),
  });

  const getTaskStatusLabel = (status?: string) =>
    status ? t(`employee.tasks.status.${status}`, status) : t("common.notAvailable");

  const handleSubmitProgress = () => {
    if (!progressTaskId) return;
    const parsedPercent = Number(progressPercent);
    if (Number.isNaN(parsedPercent) || parsedPercent < 0 || parsedPercent > 100) {
      toast.error(t("employee.tasks.validation.progressRange"));
      return;
    }
    if (parsedPercent === 100 && !evidenceUrl.trim()) {
      toast.error("Vui lòng tải lên hình ảnh nghiệm thu khi báo cáo 100%");
      return;
    }
    if (evidenceUrl.trim() && !isSupportedEvidenceUrl(evidenceUrl)) {
      toast.error(t("employee.tasks.validation.evidenceUrl", "Evidence must be a valid HTTP(S) URL."));
      return;
    }
    reportProgressMutation.mutate({
      taskId: progressTaskId,
      data: {
        progressPercent: parsedPercent,
        note: progressNote.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
      },
    });
  };
  const closeProgressDialog = () => {
    const isDirty =
      progressPercent !== "0" ||
      progressNote.trim().length > 0 ||
      evidenceUrl.trim().length > 0;
    if (
      isDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }
    setProgressTaskId(null);
    setProgressPercent("0");
    setProgressNote("");
    setEvidenceUrl("");
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto space-y-4">
      <Card className="rounded-2xl border border-border">
        <CardHeader>
          <CardTitle>{t("employee.tasks.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("employee.tasks.loading")}</p>
          ) : isError ? (
            <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700">
              <p className="font-semibold">{t("employee.tasks.error", "Đã xảy ra lỗi khi tải dữ liệu công việc.")}</p>
              <p className="text-sm mt-1">{error instanceof Error ? error.message : String(error)}</p>
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
              Bạn hiện không có công việc nào cần xử lý.
            </p>
          ) : (
            <div className="space-y-6">
              {tasksBySeason.map((group) => (
                <div key={`${group.seasonId ?? "no-season"}-${group.seasonName}`} className="space-y-2">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between bg-muted/30 p-3 rounded-lg">
                    <h3 className="text-sm font-semibold text-foreground flex items-center">
                       {group.seasonName}
                    </h3>
                    {group.seasonId && (
                      <Button
                        type="button"
                        className="min-h-[44px]"
                        onClick={() => setPlanSeasonId(group.seasonId)}
                      >
                        {t("employee.tasks.actions.viewSeasonPlan")}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {group.tasks.map((task: any) => {
                      const isOverdue = task.status === "OVERDUE" || (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED");
                      
                      return (
                        <div key={task.taskId} className={`p-4 rounded-xl border ${isOverdue ? 'border-red-300 bg-red-50/40' : 'border-border bg-card hover:border-primary/30 transition-colors'} shadow-sm flex flex-col`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-foreground line-clamp-2">{task.title}</h4>
                            <Badge className={getTaskStatusClassName(task.status)}>
                              {getTaskStatusLabel(task.status)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{task.description || "-"}</p>
                          
                          <div className="space-y-2.5 mb-4 text-sm flex-1 bg-muted/20 p-3 rounded-md border border-border/50">
                            {/* [FIX] Hiển thị Plot Name và Diện Tích */}
                            {(task.plotName || task.plot) && (
                              <div className="flex items-center text-foreground font-medium min-w-0">
                                <MapPin className="w-4 h-4 mr-2 text-primary shrink-0" />
                                <span className="truncate" title={task.plotName || task.plot || undefined}>
                                  {task.plotName || task.plot}
                                  {task.plotArea ? (
                                    <span className="text-muted-foreground font-normal">
                                      {" "}• {task.plotArea.toLocaleString()} m²
                                    </span>
                                  ) : ""}
                                </span>
                              </div>
                            )}

                            {task.estimatedDays && (
                              <div className="flex items-center text-muted-foreground">
                                <Clock className="w-4 h-4 mr-2 text-blue-500" />
                                <span>Dự kiến: <strong>{task.estimatedDays} ngày</strong></span>
                              </div>
                            )}
                            
                            {(task.dueDate || task.estimatedCompletionDate) && (
                              <div className={`flex items-center ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>Hạn chót: {task.dueDate || task.estimatedCompletionDate}</span>
                              </div>
                            )}
                            
                            {/* [FIX] XÓA NÚT XEM BẢN ĐỒ GÂY LỖI */}
                          </div>
                          
                          <div className="pt-3 border-t border-border flex justify-end gap-2 mt-auto">
                            {(task.status === "PENDING" || task.status === "OVERDUE") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => acceptTaskMutation.mutate(task.taskId)}
                                disabled={acceptTaskMutation.isPending}
                                className="min-h-[44px] w-full sm:w-auto"
                              >
                                {t("employee.tasks.actions.acceptTask")}
                              </Button>
                            )}
                            {task.status !== "CANCELLED" && (
                              <Button 
                                size="sm" 
                                onClick={() => setProgressTaskId(task.taskId)}
                                className="min-h-[44px] w-full sm:w-auto"
                              >
                                {t("employee.tasks.actions.reportProgress")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={progressTaskId !== null} onOpenChange={(open) => !open && closeProgressDialog()}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <BackButton onClick={closeProgressDialog} className="w-fit" />
            <DialogTitle>{t("employee.tasks.progressDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:gap-1 min-w-0">
              <span className="shrink-0">{t("employee.tasks.progressDialog.taskLabel")}</span>
              <span className="text-foreground truncate font-medium" title={selectedTask?.title || undefined}>{selectedTask?.title || t("common.notAvailable")}</span>
            </p>
            <div className="space-y-2">
              <Label>{t("employee.tasks.progressDialog.progressPercent")}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                className="min-h-[44px]"
                value={progressPercent}
                onChange={(event) => setProgressPercent(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("employee.tasks.progressDialog.note")}</Label>
              <Textarea
                rows={4}
                value={progressNote}
                className="min-h-[44px]"
                onChange={(event) => setProgressNote(event.target.value)}
                placeholder={t("employee.tasks.progressDialog.notePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("employee.tasks.progressDialog.evidenceUrl", "Hình ảnh nghiệm thu (Bắt buộc khi 100%)")}</Label>
              <div className="flex flex-col gap-3">
                {evidenceUrl && (
                  <div className="relative w-full max-w-sm rounded-md overflow-hidden border">
                    <img src={evidenceUrl} alt="Preview" className="w-full h-auto object-cover" />
                  </div>
                )}
                <Input
                  type="url"
                  className="min-h-[44px]"
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder={t(
                    "employee.tasks.progressDialog.evidenceUrlPlaceholder",
                    "https://storage.example/evidence/photo.jpg",
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {t(
                    "employee.tasks.progressDialog.evidenceUrlHelp",
                    "Paste the persisted HTTP(S) URL of the completion photo.",
                  )}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-[44px]" onClick={closeProgressDialog}>
              {t("common.cancel")}
            </Button>
            <Button className="min-h-[44px]" onClick={handleSubmitProgress} disabled={reportProgressMutation.isPending}>
              {t("employee.tasks.progressDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planSeasonId !== null} onOpenChange={(open) => !open && setPlanSeasonId(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <BackButton onClick={() => setPlanSeasonId(null)} className="w-fit" />
            <DialogTitle>
              {t("employee.tasks.planDialog.title", { season: selectedPlanSeasonName })}
            </DialogTitle>
          </DialogHeader>
          {isSeasonPlanLoading ? (
            <p className="text-sm text-muted-foreground">{t("employee.tasks.planDialog.loading")}</p>
          ) : !seasonPlanTasks || seasonPlanTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("employee.tasks.planDialog.empty")}</p>
          ) : (
            <div className="max-h-[55vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("employee.tasks.table.task")}</TableHead>
                    <TableHead>{t("employee.tasks.table.dueDate")}</TableHead>
                    <TableHead>{t("employee.tasks.table.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasonPlanTasks.map((task) => (
                    <TableRow key={task.taskId} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{task.description || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{task.dueDate || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getTaskStatusClassName(task.status)}>
                          {getTaskStatusLabel(task.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="min-h-[44px]" onClick={() => setPlanSeasonId(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* [FIX] XÓA TOÀN BỘ MODAL DIALOG BẢN ĐỒ Ở ĐÂY ĐỂ CHỐNG CRASH */}
    </div>
  );
}
