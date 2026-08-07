import {
  useAddSeasonEmployee,
  useAssignTaskToEmployee,
  useBulkAssignSeasonEmployees,
  useEmployeeDirectory,
  useRecalculateSeasonPayroll,
  useRemoveSeasonEmployee,
  useSeasonEmployees,
  useSeasonPayrollRecords,
  useSeasonProgressLogs,
  useUpdateSeasonEmployee,
} from "@/entities/labor";
import { useTasksBySeason } from "@/entities/task";
import { useMySeasons } from "@/entities/season/api/hooks";
import { useSeasonById } from "@/entities/season";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  PageContainer,
  PageHeader,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/shared/ui";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { Calendar, ExternalLink, RefreshCw, Trash2, UserPlus, Users, BookOpen, Filter, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { WorkTeamPanel } from "./components/WorkTeamPanel";
import { UpdateTrainingDialog } from "./components/UpdateTrainingDialog";
import { SeasonEmployeeResponse, UpdateSeasonEmployeeRequest } from "@/api/generated/model";

const LABOR_WORKSPACE_TABS = ["teams", "employees", "assignment", "progress", "payroll"] as const;
type LaborWorkspaceTab = (typeof LABOR_WORKSPACE_TABS)[number];

const formatDate = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return value;
  }
};

const formatMoney = (value?: number | null, locale = "en-US") => {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString(locale);
};

const getTaskStatusLabelKey = (status?: string) => {
  switch (status) {
    case "PENDING":
      return "tasks.status.pending";
    case "IN_PROGRESS":
      return "tasks.status.inProgress";
    case "DONE":
      return "tasks.status.done";
    case "OVERDUE":
      return "tasks.status.overdue";
    case "CANCELLED":
      return "seasonWorkspace.status.cancelled";
    default:
      return null;
  }
};

const getTaskStatusClassName = (status?: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "OVERDUE":
      return "bg-red-100 text-red-700 border-red-200";
    case "CANCELLED":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
};

export function LaborManagementPage() {
  const { t, locale } = useI18n();
  const { seasonId: workspaceSeasonIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceSeasonId = Number(workspaceSeasonIdParam);
  const isWorkspaceScoped = Number.isFinite(workspaceSeasonId) && workspaceSeasonId > 0;

  // Season selection - local state with useMySeasons
  const { data: mySeasons, isLoading: isSeasonsLoading } = useMySeasons();
  const { data: workspaceSeasonDetail } = useSeasonById(workspaceSeasonId, {
    enabled: isWorkspaceScoped,
  });
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(
    isWorkspaceScoped ? workspaceSeasonId : null
  );
  const seasonId = selectedSeasonId ?? 0;

  // Keep season selection aligned with workspace route when scoped by season
  useEffect(() => {
    if (!isWorkspaceScoped) return;
    if (selectedSeasonId !== workspaceSeasonId) {
      setSelectedSeasonId(workspaceSeasonId);
    }
  }, [isWorkspaceScoped, selectedSeasonId, workspaceSeasonId]);

  // Auto-select first season when data loads
  useEffect(() => {
    if (isWorkspaceScoped) return;
    if (!isSeasonsLoading && mySeasons && mySeasons.length > 0 && selectedSeasonId === null) {
      setSelectedSeasonId(mySeasons[0].seasonId ?? null);
    }
  }, [isWorkspaceScoped, isSeasonsLoading, mySeasons, selectedSeasonId]);

  const selectedSeasonName = useMemo(() => {
    if (selectedSeasonId && mySeasons) {
      const found = mySeasons.find((s) => s.seasonId === selectedSeasonId);
      if (found) {
        return `${found.seasonName}${found.status ? ` (${found.status})` : ""}`;
      }
    }

    if (isWorkspaceScoped && workspaceSeasonDetail) {
      return `${workspaceSeasonDetail.seasonName}${workspaceSeasonDetail.status ? ` (${workspaceSeasonDetail.status})` : ""}`;
    }

    return selectedSeasonId ? t("seasonWorkspace.fallbackSeasonName", { id: selectedSeasonId }) : null;
  }, [selectedSeasonId, mySeasons, isWorkspaceScoped, workspaceSeasonDetail, t]);

  const selectedSeasonStatus = useMemo(() => {
    if (selectedSeasonId && mySeasons) {
      const seasonStatus = mySeasons.find((s) => s.seasonId === selectedSeasonId)?.status;
      if (seasonStatus) return seasonStatus;
    }
    return isWorkspaceScoped ? workspaceSeasonDetail?.status ?? null : null;
  }, [selectedSeasonId, mySeasons, isWorkspaceScoped, workspaceSeasonDetail]);

  const isSeasonLocked =
    selectedSeasonStatus === "COMPLETED"
    || selectedSeasonStatus === "CANCELLED"
    || selectedSeasonStatus === "ARCHIVED";

  const [selectedDirectoryEmployeeId, setSelectedDirectoryEmployeeId] = useState<string>("");
  const [selectedBulkEmployeeIds, setSelectedBulkEmployeeIds] = useState<number[]>([]);
  const [wagePerTask, setWagePerTask] = useState<string>("");
  const [taskAssigneeDraft, setTaskAssigneeDraft] = useState<Record<number, string>>({});
  
  const [trainingDialogEmployee, setTrainingDialogEmployee] = useState<SeasonEmployeeResponse | null>(null);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [trainingFilter, setTrainingFilter] = useState<"all" | "trained" | "untrained">("all");

  const { data: employeeDirectoryData, isLoading: isEmployeeDirectoryLoading } = useEmployeeDirectory(
    { page: 0, size: 200 },
    { enabled: seasonId > 0 }
  );

  const { data: seasonEmployeesData, isLoading: isSeasonEmployeesLoading } = useSeasonEmployees(
    seasonId,
    { page: 0, size: 200 },
    { enabled: seasonId > 0 }
  );

  const { data: tasksData, isLoading: isTasksLoading } = useTasksBySeason(
    seasonId,
    { page: 0, size: 200, sortBy: "dueDate", sortDirection: "asc" },
    { enabled: seasonId > 0 }
  );

  const { data: progressData, isLoading: isProgressLoading } = useSeasonProgressLogs(
    seasonId,
    { page: 0, size: 100 },
    { enabled: seasonId > 0 }
  );

  const { data: payrollData, isLoading: isPayrollLoading } = useSeasonPayrollRecords(
    seasonId,
    { page: 0, size: 100 },
    { enabled: seasonId > 0 }
  );

  const addSeasonEmployeeMutation = useAddSeasonEmployee(seasonId, {
    onSuccess: () => {
      toast.success(t("laborWorkspace.toast.addEmployeeSuccess"));
      setSelectedDirectoryEmployeeId("");
      setWagePerTask("");
    },
    onError: (error) => toast.error(error.message || t("laborWorkspace.toast.addEmployeeError")),
  });

  const bulkAssignSeasonEmployeesMutation = useBulkAssignSeasonEmployees(seasonId, {
    onSuccess: (rows) => {
      toast.success(t("laborWorkspace.toast.bulkAddEmployeeSuccess", { count: rows.length }));
      setSelectedBulkEmployeeIds([]);
      setWagePerTask("");
    },
    onError: (error) => toast.error(error.message || t("laborWorkspace.toast.bulkAddEmployeeError")),
  });

  const removeSeasonEmployeeMutation = useRemoveSeasonEmployee(seasonId, {
    onSuccess: () => toast.success(t("laborWorkspace.toast.removeEmployeeSuccess")),
    onError: (error) => toast.error(error.message || t("laborWorkspace.toast.removeEmployeeError")),
  });

  const assignTaskMutation = useAssignTaskToEmployee(seasonId, {
    onSuccess: () => toast.success(t("laborWorkspace.toast.assignTaskSuccess")),
    onError: (error) => toast.error(error.message || t("laborWorkspace.toast.assignTaskError")),
  });

  const updateSeasonEmployeeMutation = useUpdateSeasonEmployee(seasonId, {
    onSuccess: () => {
      toast.success(t("laborWorkspace.toast.updateEmployeeSuccess", "Cập nhật thành công"));
      setIsTrainingDialogOpen(false);
      setTrainingDialogEmployee(null);
    },
    onError: (error) => toast.error(error.message || t("laborWorkspace.toast.updateEmployeeError", "Có lỗi xảy ra")),
  });

  const recalculatePayrollMutation = useRecalculateSeasonPayroll(seasonId, {
    onSuccess: () => toast.success(t("laborWorkspace.toast.recalculatePayrollSuccess")),
    onError: (error) => toast.error(error.message || t("laborWorkspace.toast.recalculatePayrollError")),
  });

  const seasonEmployeesAll = seasonEmployeesData?.items ?? [];
  const seasonEmployees = useMemo(() => {
    if (trainingFilter === "trained") return seasonEmployeesAll.filter(e => e.isTrained);
    if (trainingFilter === "untrained") return seasonEmployeesAll.filter(e => !e.isTrained);
    return seasonEmployeesAll;
  }, [seasonEmployeesAll, trainingFilter]);

  const tasks = tasksData?.items ?? [];
  const progressLogs = progressData?.items ?? [];
  const payrollRecords = payrollData?.items ?? [];

  const seasonEmployeeIds = useMemo(
    () => new Set(seasonEmployees.map((employee) => employee.employeeUserId)),
    [seasonEmployees]
  );

  const availableDirectoryEmployees = useMemo(
    () =>
      (employeeDirectoryData?.items ?? []).filter(
        (employee) => !seasonEmployeeIds.has(employee.userId)
      ),
    [employeeDirectoryData, seasonEmployeeIds]
  );

  const activeSeasonEmployees = useMemo(
    () =>
      seasonEmployees
        .filter((employee) => employee.active !== false)
        .map((employee) => ({
          userId: employee.employeeUserId,
          label:
            employee.employeeName ||
            employee.employeeUsername ||
            employee.employeeEmail ||
            t("seasonWorkspace.employeeFallback", { id: employee.employeeUserId }),
        })),
    [seasonEmployees, t]
  );

  const canMutateSeason = !!selectedSeasonId && !isSeasonLocked;
  const tabParam = searchParams.get("tab");
  const activeTab: LaborWorkspaceTab = LABOR_WORKSPACE_TABS.includes(tabParam as LaborWorkspaceTab)
    ? (tabParam as LaborWorkspaceTab)
    : "teams";

  const handleTabChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", value);
      return next;
    });
  };

  const handleAddSeasonEmployee = () => {
    if (!canMutateSeason) {
      toast.error(t("laborWorkspace.validation.seasonLockedUpdate"));
      return;
    }
    if (!selectedDirectoryEmployeeId) {
      toast.error(t("laborWorkspace.validation.selectEmployee"));
      return;
    }

    const parsedWage = wagePerTask.trim().length ? Number(wagePerTask) : undefined;
    if (parsedWage !== undefined && (Number.isNaN(parsedWage) || parsedWage < 0)) {
      toast.error(t("laborWorkspace.validation.invalidWagePerTask"));
      return;
    }

    addSeasonEmployeeMutation.mutate({
      employeeUserId: Number(selectedDirectoryEmployeeId),
      wagePerTask: parsedWage,
    });
  };

  const handleBulkAssignSeasonEmployees = () => {
    if (!canMutateSeason) {
      toast.error(t("laborWorkspace.validation.seasonLockedUpdate"));
      return;
    }
    if (selectedBulkEmployeeIds.length === 0) {
      toast.error(t("laborWorkspace.validation.selectAtLeastOneEmployee"));
      return;
    }

    const parsedWage = wagePerTask.trim().length ? Number(wagePerTask) : undefined;
    if (parsedWage !== undefined && (Number.isNaN(parsedWage) || parsedWage < 0)) {
      toast.error(t("laborWorkspace.validation.invalidWagePerTask"));
      return;
    }

    bulkAssignSeasonEmployeesMutation.mutate({
      employeeUserIds: selectedBulkEmployeeIds,
      wagePerTask: parsedWage,
    });
  };

  const handleAssignTask = (taskId: number) => {
    if (!canMutateSeason) {
      toast.error(t("laborWorkspace.validation.seasonLockedAssign"));
      return;
    }
    const selectedAssigneeId = taskAssigneeDraft[taskId];
    if (!selectedAssigneeId) {
      toast.error(t("laborWorkspace.validation.selectEmployeeForAssignment"));
      return;
    }

    assignTaskMutation.mutate({
      taskId,
      employeeUserId: Number(selectedAssigneeId),
    });
  };

  const handleRemoveSeasonEmployee = (employeeUserId: number) => {
    if (!canMutateSeason) {
      toast.error(t("laborWorkspace.validation.seasonLockedDelete"));
      return;
    }
    removeSeasonEmployeeMutation.mutate(employeeUserId);
  };

  const isLoadingBase = isEmployeeDirectoryLoading || isSeasonEmployeesLoading;

  if (!isWorkspaceScoped && isSeasonsLoading) {
    return (
      <PageContainer variant="wide">
        <Card className="rounded-xl border border-border shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t("laborWorkspace.loadingSeasons")}
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (!isWorkspaceScoped && (!mySeasons || mySeasons.length === 0)) {
    return (
      <PageContainer variant="wide">
        <Card className="rounded-xl border border-border shadow-sm">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg text-foreground">{t("laborWorkspace.emptySeasonsTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("laborWorkspace.emptySeasonsDescription")}
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="wide" className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border/40">
        <PageHeader
          className="mb-0"
          icon={
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Users className="w-6 h-6" />
            </div>
          }
          title={t("laborWorkspace.title")}
          subtitle={t("laborWorkspace.subtitle")}
        />

        <div className="flex items-center gap-3">
          {isWorkspaceScoped ? (
            <div className="rounded-2xl border border-border/60 px-4 py-2 text-sm bg-card/50 shadow-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("laborWorkspace.currentSeasonLabel", { season: "" })}</span>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent shadow-none font-medium">
                {selectedSeasonName ?? t("seasonWorkspace.fallbackSeasonName", { id: workspaceSeasonId })}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-card/50 rounded-2xl border border-border/60 p-1 shadow-sm">
              <div className="pl-3 pr-1 text-muted-foreground">
                <Calendar className="w-4 h-4" />
              </div>
              <Select
                value={selectedSeasonId?.toString() ?? ""}
                onValueChange={(val) => setSelectedSeasonId(Number(val))}
              >
                <SelectTrigger className="rounded-xl border-transparent bg-transparent shadow-none w-full sm:w-[280px] hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder={t("laborWorkspace.selectSeasonPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(mySeasons ?? []).map((season) => (
                    <SelectItem
                      key={season.seasonId}
                      value={season.seasonId?.toString() ?? ''}
                      className="rounded-lg cursor-pointer"
                    >
                      {season.seasonName}{" "}
                      {season.status && <span className="text-muted-foreground text-xs ml-1">({season.status})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {isSeasonLocked && (
        <Card className="rounded-xl border border-amber-300 bg-amber-50 shadow-sm">
          <CardContent className="p-4 text-sm text-amber-900">
            {t("laborWorkspace.lockedSeasonBanner")}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">{t("laborWorkspace.tabs.teams", "Đội nhóm")}</TabsTrigger>
          <TabsTrigger value="employees">{t("laborWorkspace.tabs.employees")}</TabsTrigger>
          <TabsTrigger value="assignment">{t("laborWorkspace.tabs.assignment")}</TabsTrigger>
          <TabsTrigger value="progress">{t("laborWorkspace.tabs.progress")}</TabsTrigger>
          <TabsTrigger value="payroll">{t("laborWorkspace.tabs.payroll")}</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <WorkTeamPanel seasonId={seasonId} />
        </TabsContent>

        <TabsContent value="employees" className="space-y-8 mt-6">
          {/* Add Employees Section */}
          <section className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t("laborWorkspace.sections.addEmployees.title")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Thêm nhân công vào mùa vụ và thiết lập mức lương mặc định.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-2xl bg-card border border-border/50 shadow-sm">
              <div className="md:col-span-5 space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("laborWorkspace.fields.availableEmployees")}</Label>
                <Select
                  value={selectedDirectoryEmployeeId}
                  onValueChange={setSelectedDirectoryEmployeeId}
                  disabled={!canMutateSeason}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background border-border/60 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder={t("laborWorkspace.fields.selectEmployeePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDirectoryEmployees.map((employee) => (
                      <SelectItem key={employee.userId} value={String(employee.userId)} className="rounded-lg cursor-pointer">
                        {employee.fullName || employee.username || employee.email || t("seasonWorkspace.employeeFallback", { id: employee.userId })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-4 space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("laborWorkspace.fields.wagePerTaskVnd")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={wagePerTask}
                  onChange={(event) => setWagePerTask(event.target.value)}
                  placeholder={t("laborWorkspace.fields.wagePerTaskPlaceholder")}
                  disabled={!canMutateSeason}
                  className="h-11 rounded-xl bg-background border-border/60 hover:border-primary/50 transition-colors"
                />
              </div>

              <div className="md:col-span-3 flex items-end">
                <Button
                  className="w-full h-11 rounded-xl"
                  onClick={handleAddSeasonEmployee}
                  disabled={!canMutateSeason || addSeasonEmployeeMutation.isPending || !selectedDirectoryEmployeeId}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t("laborWorkspace.actions.addEmployee")}
                </Button>
              </div>
            </div>

            {/* Bulk Add Section */}
            <div className="rounded-2xl border border-border/50 overflow-hidden">
              <div className="bg-muted/30 p-4 border-b border-border/50 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">{t("laborWorkspace.bulk.description")}</h4>
                  <p className="text-xs text-muted-foreground">Chọn nhiều nhân công từ danh bạ để thêm vào mùa vụ cùng lúc.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs"
                    onClick={() =>
                      setSelectedBulkEmployeeIds(
                        availableDirectoryEmployees.map((employee) => employee.userId)
                      )
                    }
                    disabled={!canMutateSeason || availableDirectoryEmployees.length === 0}
                  >
                    {t("laborWorkspace.bulk.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setSelectedBulkEmployeeIds([])}
                    disabled={selectedBulkEmployeeIds.length === 0}
                  >
                    {t("laborWorkspace.bulk.clearSelection")}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-card">
                {availableDirectoryEmployees.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t("laborWorkspace.bulk.emptyAvailableEmployees")}</p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableDirectoryEmployees.map((employee) => {
                      const checked = selectedBulkEmployeeIds.includes(employee.userId);
                      const label = employee.fullName || employee.username || employee.email || t("seasonWorkspace.employeeFallback", { id: employee.userId });
                      return (
                        <label
                          key={employee.userId}
                          className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                            checked ? "border-primary bg-primary/5" : "border-border/60 bg-background hover:border-primary/50"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) =>
                              setSelectedBulkEmployeeIds((prev) => {
                                if (nextChecked) {
                                  return prev.includes(employee.userId)
                                    ? prev
                                    : [...prev, employee.userId];
                                }
                                return prev.filter((id) => id !== employee.userId);
                              })
                            }
                            disabled={!canMutateSeason}
                            className="mt-0.5 rounded shadow-none data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{label}</p>
                            <p className="text-xs text-muted-foreground truncate">{employee.email ?? "No email"}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {availableDirectoryEmployees.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                    <Button
                      onClick={handleBulkAssignSeasonEmployees}
                      className="rounded-xl px-6"
                      disabled={
                        !canMutateSeason
                        || bulkAssignSeasonEmployeesMutation.isPending
                        || selectedBulkEmployeeIds.length === 0
                      }
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t("laborWorkspace.actions.bulkAddEmployees")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Season Employees List Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{t("laborWorkspace.sections.seasonEmployees.title")}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Select value={trainingFilter} onValueChange={(val: any) => setTrainingFilter(val)}>
                  <SelectTrigger className="w-[160px] h-9 rounded-xl border-border/60 bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Filter className="w-3.5 h-3.5" />
                      <SelectValue placeholder="Lọc trạng thái" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="rounded-lg cursor-pointer">{t("laborWorkspace.filter.all", "Tất cả")}</SelectItem>
                    <SelectItem value="trained" className="rounded-lg cursor-pointer">{t("laborWorkspace.filter.trained", "Đã Train")}</SelectItem>
                    <SelectItem value="untrained" className="rounded-lg cursor-pointer">{t("laborWorkspace.filter.untrained", "Chưa Train")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
              {isLoadingBase ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("laborWorkspace.sections.seasonEmployees.loading")}</p>
                </div>
              ) : seasonEmployees.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("laborWorkspace.sections.seasonEmployees.empty")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                      <TableHead>{t("laborWorkspace.table.employee")}</TableHead>
                      <TableHead>{t("laborWorkspace.table.email")}</TableHead>
                      <TableHead>{t("laborWorkspace.table.wagePerTask")}</TableHead>
                      <TableHead>{t("laborWorkspace.table.status")}</TableHead>
                      <TableHead>{t("laborWorkspace.table.training", "Đào tạo")}</TableHead>
                      <TableHead className="text-right">{t("laborWorkspace.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasonEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          {employee.employeeName || employee.employeeUsername || t("seasonWorkspace.employeeFallback", { id: employee.employeeUserId })}
                        </TableCell>
                        <TableCell>{employee.employeeEmail ?? "-"}</TableCell>
                        <TableCell>{formatMoney(employee.wagePerTask, locale)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              employee.active === false
                                ? "bg-muted text-muted-foreground border-border"
                                : "bg-emerald-100 text-emerald-700 border-emerald-200"
                            }
                          >
                            {employee.active === false ? t("laborWorkspace.status.inactive") : t("laborWorkspace.status.active")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.isTrained && employee.trainingNotes ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    className="bg-emerald-100 text-emerald-700 border-emerald-200 cursor-help"
                                  >
                                    {t("laborWorkspace.status.trained", "Đã Train")}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-[200px] text-sm break-words whitespace-pre-wrap">{employee.trainingNotes}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge
                              className={
                                employee.isTrained
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-muted text-muted-foreground border-border"
                              }
                            >
                              {employee.isTrained ? t("laborWorkspace.status.trained", "Đã Train") : t("laborWorkspace.status.untrained", "Chưa Train")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 hover:bg-muted"
                              onClick={() => {
                                setTrainingDialogEmployee(employee as SeasonEmployeeResponse);
                                setIsTrainingDialogOpen(true);
                              }}
                              disabled={!canMutateSeason || updateSeasonEmployeeMutation.isPending}
                            >
                              <BookOpen className="w-4 h-4 mr-2" />
                              <span className="sr-only md:not-sr-only md:inline-block">{t("laborWorkspace.actions.updateTraining", "Cập nhật đào tạo")}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveSeasonEmployee(employee.employeeUserId as number)}
                              disabled={!canMutateSeason || removeSeasonEmployeeMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="assignment" className="space-y-6 mt-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t("laborWorkspace.sections.assignment.title")}</h3>
              <p className="text-sm text-muted-foreground mt-1">Phân công các công việc trong mùa vụ cho nhân công.</p>
            </div>
            
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
              {isTasksLoading ? (
                <p className="text-sm text-muted-foreground">{t("laborWorkspace.sections.assignment.loading")}</p>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("laborWorkspace.sections.assignment.empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("laborWorkspace.assignmentTable.task")}</TableHead>
                      <TableHead>{t("laborWorkspace.assignmentTable.status")}</TableHead>
                      <TableHead>{t("laborWorkspace.assignmentTable.currentAssignee")}</TableHead>
                      <TableHead>{t("laborWorkspace.assignmentTable.newAssignee")}</TableHead>
                      <TableHead className="text-right">{t("laborWorkspace.assignmentTable.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const fallbackCurrentAssignee = task.userName || (task.userId ? t("laborWorkspace.userFallback", { id: task.userId }) : "-");
                      const currentSelection =
                        taskAssigneeDraft[task.taskId] ??
                        (activeSeasonEmployees.some((employee) => employee.userId === task.userId)
                          ? String(task.userId)
                          : "");
                      return (
                        <TableRow key={task.taskId}>
                          <TableCell className="font-medium text-foreground">{task.title}</TableCell>
                          <TableCell>
                            <Badge className={`${getTaskStatusClassName(task.status)} font-medium`}>
                              {(() => {
                                const taskStatusLabelKey = getTaskStatusLabelKey(task.status);
                                return taskStatusLabelKey ? t(taskStatusLabelKey) : task.status ?? "-";
                              })()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{fallbackCurrentAssignee}</TableCell>
                          <TableCell>
                            <Select
                              value={currentSelection}
                              onValueChange={(value) =>
                                setTaskAssigneeDraft((prev) => ({
                                  ...prev,
                                  [task.taskId]: value,
                                }))
                              }
                              disabled={!canMutateSeason}
                            >
                              <SelectTrigger className="w-full sm:w-[260px] h-9 rounded-xl border-border/60 bg-background hover:border-primary/50">
                                <SelectValue placeholder={t("laborWorkspace.fields.selectEmployeePlaceholder")} />
                              </SelectTrigger>
                              <SelectContent>
                                {activeSeasonEmployees.map((employee) => (
                                  <SelectItem key={employee.userId} value={String(employee.userId)} className="rounded-lg cursor-pointer">
                                    {employee.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right py-3 pr-4">
                            <Button
                              size="sm"
                              className="h-9 rounded-xl px-4"
                              onClick={() => handleAssignTask(task.taskId)}
                              disabled={!canMutateSeason || assignTaskMutation.isPending || !currentSelection}
                            >
                              {t("laborWorkspace.actions.assignTask")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6 mt-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t("laborWorkspace.sections.progress.title")}</h3>
              <p className="text-sm text-muted-foreground mt-1">Theo dõi tiến độ hoàn thành các công việc được giao.</p>
            </div>
            
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
              {isProgressLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("laborWorkspace.sections.progress.loading")}</p>
                </div>
              ) : progressLogs.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("laborWorkspace.sections.progress.empty")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>{t("laborWorkspace.progressTable.employee")}</TableHead>
                        <TableHead>{t("laborWorkspace.progressTable.task")}</TableHead>
                        <TableHead>{t("laborWorkspace.progressTable.progress")}</TableHead>
                        <TableHead>{t("laborWorkspace.progressTable.note")}</TableHead>
                        <TableHead>{t("laborWorkspace.progressTable.evidence")}</TableHead>
                        <TableHead>{t("laborWorkspace.progressTable.time")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progressLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.employeeName || t("seasonWorkspace.employeeFallback", { id: log.employeeUserId })}</TableCell>
                          <TableCell>{log.taskTitle || t("laborWorkspace.taskFallback", { id: log.taskId })}</TableCell>
                          <TableCell>
                            <Badge className="bg-primary/10 text-primary border-transparent">{log.progressPercent}%</Badge>
                          </TableCell>
                          <TableCell className="max-w-[320px] truncate text-muted-foreground">{log.note || "-"}</TableCell>
                          <TableCell>
                            {log.evidenceUrl ? (
                              <a
                                href={log.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                              >
                                {t("laborWorkspace.progressTable.openEvidence")}
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(log.loggedAt, locale)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6 mt-6">
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{t("laborWorkspace.sections.payroll.title")}</h3>
                <p className="text-sm text-muted-foreground mt-1">Quản lý và tính toán bảng lương cho nhân công.</p>
              </div>
              <Button
                onClick={() => recalculatePayrollMutation.mutate(undefined)}
                disabled={!canMutateSeason || recalculatePayrollMutation.isPending}
                className="rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("laborWorkspace.actions.recalculatePayroll")}
              </Button>
            </div>
            
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
              {isPayrollLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("laborWorkspace.sections.payroll.loading")}</p>
                </div>
              ) : payrollRecords.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("laborWorkspace.sections.payroll.empty")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>{t("laborWorkspace.payrollTable.employee")}</TableHead>
                        <TableHead>{t("laborWorkspace.payrollTable.period")}</TableHead>
                        <TableHead>{t("laborWorkspace.payrollTable.completedTasks")}</TableHead>
                        <TableHead>{t("laborWorkspace.payrollTable.wagePerTask")}</TableHead>
                        <TableHead>{t("laborWorkspace.payrollTable.totalAmount")}</TableHead>
                        <TableHead>{t("laborWorkspace.payrollTable.updatedAt")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.employeeName || t("seasonWorkspace.employeeFallback", { id: record.employeeUserId })}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {record.periodStart ?? "-"} - {record.periodEnd ?? "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-muted text-muted-foreground border-transparent font-normal">
                              {record.totalCompletedTasks} / {record.totalAssignedTasks}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatMoney(record.wagePerTask, locale)}</TableCell>
                          <TableCell className="font-semibold text-primary">{formatMoney(record.totalAmount, locale)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(record.generatedAt, locale)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <UpdateTrainingDialog
        open={isTrainingDialogOpen}
        onOpenChange={setIsTrainingDialogOpen}
        employee={trainingDialogEmployee}
        onSave={(employeeUserId, data) => updateSeasonEmployeeMutation.mutate({ employeeUserId, data })}
        isPending={updateSeasonEmployeeMutation.isPending}
      />
    </PageContainer>
  );
}



