import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Clock, ExternalLink, RefreshCw, UserRound, CheckCircle } from "lucide-react";
import { useSeasonProgressLogs } from "@/entities/labor";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useState } from "react";
import { toast } from "sonner";

interface TaskProgressReportsPanelProps {
  seasonId: number;
}

const formatDateTime = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return value;
  }
};

const sortNewestFirst = <T extends { loggedAt?: string | null }>(rows: T[]) =>
  [...rows].sort((a, b) => {
    const aTime = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
    const bTime = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
    return bTime - aTime;
  });

export function TaskProgressReportsPanel({ seasonId }: TaskProgressReportsPanelProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useSeasonProgressLogs(
    seasonId,
    { page: 0, size: 100 },
    { enabled: seasonId > 0 }
  );

  const [verifyLog, setVerifyLog] = useState<any>(null);

  const handleVerify = (status: "APPROVED" | "REJECTED") => {
    if (!verifyLog) return;
    toast.success(status === "APPROVED" ? `Đã duyệt công việc ${verifyLog.taskTitle} và cộng tiền vào bảng lương!` : `Đã từ chối công việc ${verifyLog.taskTitle}`);
    setVerifyLog(null);
  };

  const progressLogs = useMemo(() => sortNewestFirst(data?.items ?? []), [data?.items]);
  const latestLogs = progressLogs.slice(0, 6);
  const latestLog = progressLogs[0];

  const uniqueEmployeeCount = useMemo(
    () => new Set(progressLogs.map((log) => log.employeeUserId).filter(Boolean)).size,
    [progressLogs]
  );

  const averageProgress = useMemo(() => {
    if (progressLogs.length === 0) return 0;
    const total = progressLogs.reduce((sum, log) => sum + log.progressPercent, 0);
    return Math.round(total / progressLogs.length);
  }, [progressLogs]);

  return (
    <Card className="border-border acm-rounded-lg acm-card-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              {t("tasks.progressReports.title")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("tasks.progressReports.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {t("tasks.progressReports.refresh")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/farmer/seasons/${seasonId}/workspace/labor-management?tab=progress`)}
            >
              <UserRound className="mr-2 h-4 w-4" />
              {t("tasks.progressReports.openLabor")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">
              {t("tasks.progressReports.totalReports")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{progressLogs.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">
              {t("tasks.progressReports.reportingEmployees")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{uniqueEmployeeCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase text-muted-foreground">
                {t("tasks.progressReports.averageProgress")}
              </p>
              <span className="text-sm font-medium text-foreground">{averageProgress}%</span>
            </div>
            <Progress value={averageProgress} className="mt-3 h-2" />
          </div>
        </div>

        {latestLog && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {t("tasks.progressReports.latest")}
                  </Badge>
                  <p className="text-sm font-medium text-foreground">
                    {latestLog.taskTitle || t("laborWorkspace.taskFallback", { id: latestLog.taskId })}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {latestLog.employeeName || t("seasonWorkspace.employeeFallback", { id: latestLog.employeeUserId })}
                  {" · "}
                  {formatDateTime(latestLog.loggedAt, locale)}
                </p>
                {latestLog.note && (
                  <p className="line-clamp-2 text-sm text-foreground">{latestLog.note}</p>
                )}
              </div>
              <div className="w-full md:w-56">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("tasks.progressReports.progress")}</span>
                  <span className="font-semibold text-foreground">{latestLog.progressPercent}%</span>
                </div>
                <Progress value={latestLog.progressPercent} className="h-2" />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t("tasks.progressReports.loading")}
          </div>
        ) : progressLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("tasks.progressReports.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>{t("laborWorkspace.progressTable.task")}</TableHead>
                  <TableHead>{t("laborWorkspace.progressTable.employee")}</TableHead>
                  <TableHead>{t("laborWorkspace.progressTable.progress")}</TableHead>
                  <TableHead>{t("laborWorkspace.progressTable.note")}</TableHead>
                  <TableHead>{t("laborWorkspace.progressTable.evidence")}</TableHead>
                  <TableHead>{t("laborWorkspace.progressTable.time")}</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="min-w-[160px] font-medium">
                      {log.taskTitle || t("laborWorkspace.taskFallback", { id: log.taskId })}
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      {log.employeeName || t("seasonWorkspace.employeeFallback", { id: log.employeeUserId })}
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Progress value={log.progressPercent} className="h-2 w-20" />
                        <span className="text-sm font-medium">{log.progressPercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate">{log.note || "-"}</TableCell>
                    <TableCell>
                      {log.evidenceUrl ? (
                        <a
                          href={log.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {t("tasks.progressReports.openEvidence")}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="min-w-[170px]">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(log.loggedAt, locale)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.progressPercent === 100 && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setVerifyLog(log)}>
                          <CheckCircle className="w-4 h-4 mr-1 text-emerald-500" />
                          Duyệt
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!verifyLog} onOpenChange={(open) => !open && setVerifyLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duyệt công việc: {verifyLog?.taskTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nhân công: {verifyLog?.employeeName}</p>
              <p className="text-sm text-muted-foreground">Ghi chú: {verifyLog?.note || "-"}</p>
            </div>
            {verifyLog?.evidenceUrl ? (
              <div className="rounded-md overflow-hidden border">
                <img src={verifyLog.evidenceUrl} alt="Evidence" className="w-full h-auto" />
              </div>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">Không có hình ảnh báo cáo.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleVerify("REJECTED")}>Từ chối</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleVerify("APPROVED")}>Duyệt & Tính lương</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
