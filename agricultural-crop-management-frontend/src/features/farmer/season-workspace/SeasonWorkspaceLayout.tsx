import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/shared/ui/badge";
import { BackButton } from "@/shared/ui/back-button";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Progress } from "@/shared/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { expenseKeys, useAllFarmerExpenses } from "@/entities/expense";
import { useSeasonEmployees } from "@/entities/labor";
import {
  LOG_TYPES,
  useCreateFieldLog,
  useFieldLogsBySeason,
} from "@/entities/field-log";
import { harvestKeys, useAllFarmerHarvests } from "@/entities/harvest";
import { useMyWarehouses } from "@/entities/inventory";
import { useSeasonById } from "@/entities/season";
import { useCreateTask, useTasksBySeason } from "@/entities/task";
import { ExpenseFormModal } from "@/features/farmer/expense-management/components/ExpenseFormModal";
import { useExpenseManagement } from "@/features/farmer/expense-management/hooks/useExpenseManagement";
import { AddBatchDialog } from "@/features/farmer/harvests/components/AddBatchDialog";
import { useHarvestManagement } from "@/features/farmer/harvests/hooks/useHarvestManagement";
import { CreateTaskDialog } from "@/features/farmer/tasks/components/CreateTaskDialog";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useSeason } from "@/shared/contexts";
import {
  AlertCircle,
  BarChart3,
  Beaker,
  Bug,
  Calendar,
  ClipboardList,
  DollarSign,
  Droplets,
  FileText,
  Loader2,
  PackageCheck,
  Sprout,
  TestTubeDiagonal,
  Users,
  Wheat,
} from "lucide-react";
import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return value;
  }
};

const getSeasonStatusLabel = (t: (key: string) => string, status?: string) => {
  switch (status) {
    case "PLANNED":
      return t("seasonWorkspace.status.planned");
    case "ACTIVE":
      return t("seasonWorkspace.status.active");
    case "COMPLETED":
      return t("seasonWorkspace.status.completed");
    case "CANCELLED":
      return t("seasonWorkspace.status.cancelled");
    case "ARCHIVED":
      return t("seasonWorkspace.status.archived");
    default:
      return t("seasonWorkspace.status.unknown");
  }
};

const getSeasonStatusClassName = (status?: string) => {
  switch (status) {
    case "PLANNED":
      return "acm-status-unavailable";
    case "ACTIVE":
      return "acm-status-measured";
    case "COMPLETED":
      return "acm-status-level-low";
    case "CANCELLED":
      return "acm-status-level-high";
    default:
      return "acm-status-missing";
  }
};

const getHarvestWorkflowLabel = (t: (key: string) => string, progressPercent: number) => {
  if (progressPercent >= 100) return t("seasonWorkspace.harvestWorkflow.completed");
  if (progressPercent > 0) return t("seasonWorkspace.harvestWorkflow.inProgress");
  return t("seasonWorkspace.harvestWorkflow.notStarted");
};

const getHarvestWorkflowClassName = (progressPercent: number) => {
  if (progressPercent >= 100) return "acm-status-measured";
  if (progressPercent > 0) return "acm-status-estimated";
  return "acm-status-unavailable";
};

const WORKSPACE_MODULE_TABS = [
  { key: "tasks", path: "tasks", labelKey: "nav.tasks", fallbackLabel: "Cong viec", icon: ClipboardList },
  { key: "field-logs", path: "field-logs", labelKey: "nav.fieldLogs", fallbackLabel: "Nhat ky dong ruong", icon: FileText },
  { key: "disease", path: "disease", labelKey: "nav.disease", fallbackLabel: "Dich benh", icon: Bug },
  { key: "expenses", path: "expenses", labelKey: "nav.expenses", fallbackLabel: "Chi phi", icon: DollarSign },
  { key: "harvest", path: "harvest", labelKey: "nav.harvest", fallbackLabel: "Thu hoach", icon: Wheat },
  { key: "labor-management", path: "labor-management", labelKey: "nav.laborManagement", fallbackLabel: "Nhan cong", icon: Users },
  { key: "nutrient-inputs", path: "nutrient-inputs", labelKey: "nav.nutrientInputs", fallbackLabel: "Nutrient Inputs", icon: Beaker },
  { key: "irrigation-water-analyses", path: "irrigation-water-analyses", labelKey: "nav.irrigationWaterAnalysis", fallbackLabel: "Irrigation Analysis", icon: Droplets },
  { key: "soil-tests", path: "soil-tests", labelKey: "nav.soilTests", fallbackLabel: "Soil Tests", icon: TestTubeDiagonal },
  { key: "reports", path: "reports", labelKey: "nav.reports", fallbackLabel: "Bao cao", icon: BarChart3 },
  { key: "production-diary", path: "production-diary", labelKey: "nav.productionDiary", fallbackLabel: "Nhat ky SX", icon: FileText },
] as const;

const getTodayDate = () => new Date().toISOString().split("T")[0];

interface FieldLogFormState {
  logDate: string;
  logType: string;
  notes: string;
}

const initialFieldLogFormState = (): FieldLogFormState => ({
  logDate: getTodayDate(),
  logType: "",
  notes: "",
});

export function SeasonWorkspaceLayout() {
  const { t } = useI18n();
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedSeason, setSelectedSeasonId } = useSeason();

  const seasonIdNumber = Number(seasonId);
  const hasValidSeasonId = Number.isFinite(seasonIdNumber) && seasonIdNumber > 0;
  const scopedSeasonId = hasValidSeasonId ? seasonIdNumber : 0;

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isFieldLogDialogOpen, setIsFieldLogDialogOpen] = useState(false);
  const [fieldLogFormData, setFieldLogFormData] = useState<FieldLogFormState>(initialFieldLogFormState);

  const { data: seasonDetail, isLoading: isSeasonLoading } = useSeasonById(seasonIdNumber, {
    enabled: hasValidSeasonId,
  });

  const { data: tasksData } = useTasksBySeason(
    seasonIdNumber,
    {
      page: 0,
      size: 200,
      sortBy: "dueDate",
      sortDirection: "asc",
    },
    { enabled: hasValidSeasonId }
  );

  const { data: expensesData } = useAllFarmerExpenses(
    {
      seasonId: seasonIdNumber,
      page: 0,
      size: 1,
    },
    { enabled: hasValidSeasonId }
  );

  const { data: logsData } = useFieldLogsBySeason(
    seasonIdNumber,
    {
      page: 0,
      size: 1,
    },
    { enabled: hasValidSeasonId }
  );

  const { data: harvestData } = useAllFarmerHarvests(
    {
      seasonId: seasonIdNumber,
      page: 0,
      size: 200,
    },
    { enabled: hasValidSeasonId }
  );

  const { data: seasonEmployeesData } = useSeasonEmployees(
    scopedSeasonId,
    { page: 0, size: 200 },
    { enabled: hasValidSeasonId }
  );
  const { data: outputWarehousesData } = useMyWarehouses("OUTPUT");
  const outputWarehouseCount = outputWarehousesData?.length ?? 0;
  const workspaceActionButtonClass = "w-full sm:w-auto justify-start sm:justify-center rounded-xl acm-hover-surface acm-body-text";

  const {
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    selectedExpense,
    selectedSeason: expenseSelectedSeason,
    setSelectedSeason: setExpenseSelectedSeason,
    formData: expenseFormData,
    setFormData: setExpenseFormData,
    showValidationErrors: showExpenseValidationErrors,
    seasonOptions,
    taskOptions,
    supplierOptions,
    isLoadingTasks: isLoadingExpenseTasks,
    handleTaskChange: handleExpenseTaskChange,
    handleAddExpense,
    resetForm: resetExpenseForm,
    handleOpenAddExpense,
    isCreating: isExpenseCreating,
    isUpdating: isExpenseUpdating,
  } = useExpenseManagement();

  const {
    selectedSeason: harvestSelectedSeason,
    setSelectedSeason: setHarvestSelectedSeason,
    isAddBatchOpen,
    setIsAddBatchOpen,
    formData: harvestFormData,
    setFormData: setHarvestFormData,
    handleAddBatch,
    resetForm: resetHarvestForm,
    isCreating: isHarvestCreating,
  } = useHarvestManagement();

  const createTaskMutation = useCreateTask(scopedSeasonId, {
    onSuccess: () => {
      toast.success(t("seasonWorkspace.toast.createTaskSuccess"));
      setIsTaskDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || t("seasonWorkspace.toast.createTaskError"));
    },
  });

  const resetFieldLogForm = useCallback(() => {
    setFieldLogFormData(initialFieldLogFormState());
  }, []);

  const createFieldLogMutation = useCreateFieldLog(scopedSeasonId, {
    onSuccess: () => {
      toast.success(t("fieldLogs.toast.createSuccess"));
      setIsFieldLogDialogOpen(false);
      resetFieldLogForm();
    },
    onError: (error) => {
      toast.error(error.message || t("fieldLogs.toast.createError"));
    },
  });

  useEffect(() => {
    if (!hasValidSeasonId) return;
    if (selectedSeason?.id === seasonIdNumber) return;
    setSelectedSeasonId(seasonIdNumber);
  }, [hasValidSeasonId, seasonIdNumber, selectedSeason?.id, setSelectedSeasonId]);

  useEffect(() => {
    if (!hasValidSeasonId) return;

    const scopedIdAsString = String(seasonIdNumber);
    if (expenseSelectedSeason !== scopedIdAsString) {
      setExpenseSelectedSeason(scopedIdAsString);
    }
    if (harvestSelectedSeason !== scopedIdAsString) {
      setHarvestSelectedSeason(scopedIdAsString);
    }
  }, [
    expenseSelectedSeason,
    harvestSelectedSeason,
    hasValidSeasonId,
    seasonIdNumber,
    setExpenseSelectedSeason,
    setHarvestSelectedSeason,
  ]);

  const season = seasonDetail ?? selectedSeason ?? null;
  const isSeasonWriteLocked =
    season?.status === "COMPLETED"
    || season?.status === "CANCELLED"
    || season?.status === "ARCHIVED";
  const seasonWriteLockReason = isSeasonWriteLocked
    ? t("seasonWorkspace.lockedReason")
    : undefined;
  const tasks = tasksData?.items ?? [];
  const expensesCount = expensesData?.totalElements ?? 0;
  const logsCount = logsData?.totalElements ?? 0;
  const harvestBatches = harvestData?.items ?? [];
  const harvestCount = harvestData?.totalElements ?? harvestBatches.length;

  const pendingTasks = tasks.filter((task) => task.status === "PENDING").length;
  const inProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const overdueTasks = tasks.filter((task) => task.status === "OVERDUE").length;
  const completedTasks = tasks.filter((task) => task.status === "DONE").length;

  const upcomingTask = useMemo(() => {
    const nextTask = [...tasks]
      .filter((task) => task.status !== "DONE" && !!task.dueDate)
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];

    if (!nextTask) return null;
    return `${nextTask.title} (${formatDate(nextTask.dueDate)})`;
  }, [tasks]);

  const uniqueTaskPlots = useMemo(
    () => (season?.plotName ? [season.plotName] : []),
    [season?.plotName]
  );

  const taskAssigneeOptions = useMemo(
    () =>
      (seasonEmployeesData?.items ?? [])
        .filter((employee) => employee.active !== false && !!employee.employeeUserId)
        .map((employee) => ({
          userId: employee.employeeUserId,
          displayName:
            employee.employeeName ||
            employee.employeeUsername ||
            employee.employeeEmail ||
            t("seasonWorkspace.employeeFallback", { id: employee.employeeUserId }),
        })),
    [seasonEmployeesData, t]
  );

  const totalHarvestedKg = harvestBatches.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const expectedYieldKg = season?.expectedYieldKg ?? 0;
  const harvestProgressPercent =
    expectedYieldKg > 0
      ? Math.min(100, Math.round((totalHarvestedKg / expectedYieldKg) * 100))
      : harvestCount === 0
        ? 0
        : season?.status === "COMPLETED"
          ? 100
          : 50;

  const harvestWorkflowLabel = getHarvestWorkflowLabel(t, harvestProgressPercent);
  const reportButtonLabel =
    harvestProgressPercent >= 100 ? t("seasonWorkspace.actions.finalReport") : t("seasonWorkspace.actions.interimReport");
  const isWorkspaceProcessing =
    createTaskMutation.isPending
    || createFieldLogMutation.isPending
    || isExpenseCreating
    || isExpenseUpdating
    || isHarvestCreating;
  const workspaceBusyMessage = t("seasonWorkspace.processingMessage");

  const handleQuickTaskCreate = useCallback(
    (data: {
      title: string;
      plannedDate: string;
      dueDate: string;
      description?: string;
      assigneeUserId?: number;
    }) => {
      if (!hasValidSeasonId) {
        toast.error(t("seasonWorkspace.invalidSeason"));
        return;
      }

      if (isSeasonWriteLocked) {
        toast.error(seasonWriteLockReason);
        return;
      }

      const title = data.title.trim();
      if (!title) {
        toast.error(t("tasks.validation.titleRequired"));
        return;
      }

      if (!data.dueDate) {
        toast.error(t("tasks.validation.dueDateRequired"));
        return;
      }

      createTaskMutation.mutate({
        title,
        plannedDate: data.plannedDate || data.dueDate,
        dueDate: data.dueDate,
        description: data.description,
        assigneeUserId: data.assigneeUserId,
      });
    },
    [createTaskMutation, hasValidSeasonId, isSeasonWriteLocked, seasonWriteLockReason, t]
  );

  const handleOpenExpenseModal = useCallback(() => {
    if (!hasValidSeasonId) return;
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    setExpenseSelectedSeason(String(seasonIdNumber));
    handleOpenAddExpense();
    setExpenseFormData((prev) => ({
      ...prev,
      linkedSeasonId: seasonIdNumber,
      linkedSeason: season?.seasonName ?? prev.linkedSeason,
      linkedPlotId: season?.plotId ?? prev.linkedPlotId,
    }));
  }, [
    handleOpenAddExpense,
    hasValidSeasonId,
    season?.plotId,
    season?.seasonName,
    seasonIdNumber,
    setExpenseFormData,
    setExpenseSelectedSeason,
    isSeasonWriteLocked,
    seasonWriteLockReason,
  ]);

  const handleExpenseModalOpenChange = useCallback(
    (open: boolean) => {
      setIsAddExpenseOpen(open);
      if (!open) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      }
    },
    [queryClient, setIsAddExpenseOpen]
  );

  const handleOpenFieldLogDialog = useCallback(() => {
    if (!hasValidSeasonId) return;
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    resetFieldLogForm();
    setIsFieldLogDialogOpen(true);
  }, [hasValidSeasonId, isSeasonWriteLocked, resetFieldLogForm, seasonWriteLockReason]);

  const handleSubmitFieldLog = useCallback(() => {
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    if (!fieldLogFormData.logDate || !fieldLogFormData.logType) {
      toast.error(t("fieldLogs.validation.fillRequired"));
      return;
    }

    const selectedDate = new Date(fieldLogFormData.logDate);
    const seasonStartDate = season?.startDate ? new Date(season.startDate) : null;
    const seasonEndDate = season?.endDate
      ? new Date(season.endDate)
      : season?.plannedHarvestDate
        ? new Date(season.plannedHarvestDate)
        : null;

    if (seasonStartDate && selectedDate < seasonStartDate) {
      toast.error(
        t("seasonWorkspace.validation.logDateAfterStart", { date: formatDate(season?.startDate) })
      );
      return;
    }

    if (seasonEndDate && selectedDate > seasonEndDate) {
      toast.error(
        t("seasonWorkspace.validation.logDateBeforeEnd", { date: formatDate(season?.endDate ?? season?.plannedHarvestDate) })
      );
      return;
    }

    createFieldLogMutation.mutate({
      logDate: fieldLogFormData.logDate,
      logType: fieldLogFormData.logType,
      notes: fieldLogFormData.notes.trim() || undefined,
    });
  }, [
    createFieldLogMutation,
    fieldLogFormData,
    isSeasonWriteLocked,
    season?.endDate,
    season?.plannedHarvestDate,
    season?.startDate,
    seasonWriteLockReason,
    t,
  ]);

  const handleOpenHarvestModal = useCallback(() => {
    if (!hasValidSeasonId) return;
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    if (outputWarehouseCount === 0) {
      toast.error(t("seasonWorkspace.toast.noOutputWarehouse"));
      navigate("/farmer/product-warehouse");
      return;
    }
    setHarvestSelectedSeason(String(seasonIdNumber));
    resetHarvestForm();
    setHarvestFormData((prev) => ({
      ...prev,
      season: String(seasonIdNumber),
    }));
    setIsAddBatchOpen(true);
  }, [
    hasValidSeasonId,
    isSeasonWriteLocked,
    resetHarvestForm,
    seasonIdNumber,
    seasonWriteLockReason,
    outputWarehouseCount,
    navigate,
    setHarvestFormData,
    setHarvestSelectedSeason,
    setIsAddBatchOpen,
  ]);

  const handleHarvestModalOpenChange = useCallback(
    (open: boolean) => {
      setIsAddBatchOpen(open);
      if (!open) {
        queryClient.invalidateQueries({ queryKey: harvestKeys.lists() });
      }
    },
    [queryClient, setIsAddBatchOpen]
  );

  if (!hasValidSeasonId) {
    return (
      <div className="p-6 space-y-4">
        <BackButton to="/farmer/seasons" variant="outline" />
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground">{t("seasonWorkspace.invalidSeason")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <BackButton to="/farmer/seasons" className="w-fit" />
      <Card className="border border-border rounded-2xl acm-card-elevated">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="acm-body-text text-muted-foreground uppercase">{t("seasonWorkspace.subtitle")}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground leading-tight">
                  {isSeasonLoading ? t("common.loading") : season?.seasonName ?? t("seasonWorkspace.fallbackSeasonName", { id: seasonIdNumber })}
                </h1>
                <Badge className={getSeasonStatusClassName(season?.status)}>
                  {getSeasonStatusLabel(t, season?.status)}
                </Badge>
                <Badge className={getHarvestWorkflowClassName(harvestProgressPercent)}>
                  {harvestWorkflowLabel}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setIsTaskDialogOpen(true)}
                disabled={isSeasonWriteLocked || isWorkspaceProcessing}
                title={isSeasonWriteLocked ? seasonWriteLockReason : isWorkspaceProcessing ? workspaceBusyMessage : undefined}
                className={workspaceActionButtonClass}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                {t("seasonWorkspace.actions.addTask")}
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenExpenseModal}
                disabled={isSeasonWriteLocked || isWorkspaceProcessing}
                title={isSeasonWriteLocked ? seasonWriteLockReason : isWorkspaceProcessing ? workspaceBusyMessage : undefined}
                className={workspaceActionButtonClass}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {t("seasonWorkspace.actions.recordExpense")}
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenFieldLogDialog}
                disabled={isSeasonWriteLocked || isWorkspaceProcessing}
                title={isSeasonWriteLocked ? seasonWriteLockReason : isWorkspaceProcessing ? workspaceBusyMessage : undefined}
                className={workspaceActionButtonClass}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("seasonWorkspace.actions.createFieldLog")}
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenHarvestModal}
                disabled={isSeasonWriteLocked || isWorkspaceProcessing}
                title={isSeasonWriteLocked ? seasonWriteLockReason : isWorkspaceProcessing ? workspaceBusyMessage : undefined}
                className={workspaceActionButtonClass}
              >
                <Wheat className="w-4 h-4 mr-2" />
                {t("seasonWorkspace.actions.recordHarvest")}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/farmer/seasons/${seasonIdNumber}/workspace/reports`)}
                className={workspaceActionButtonClass}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {reportButtonLabel}
              </Button>
            </div>
          </div>

          {isSeasonWriteLocked && (
            <div className="rounded-xl border border-[var(--portal-status-estimated-border)] bg-[var(--portal-status-estimated-bg)] px-4 py-2 acm-body-text text-[var(--portal-status-estimated-fg)]">
              {seasonWriteLockReason}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border p-4 bg-card acm-card-elevated acm-hover-surface">
              <p className="acm-body-text text-muted-foreground mb-1">{t("seasonWorkspace.details.crop")}</p>
              <p className="text-base text-foreground flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-600" />
                {season?.cropName ?? "-"}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-card acm-card-elevated acm-hover-surface">
              <p className="acm-body-text text-muted-foreground mb-1">{t("seasonWorkspace.details.plot")}</p>
              <p className="text-base text-foreground">{season?.plotName ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-card acm-card-elevated acm-hover-surface">
              <p className="acm-body-text text-muted-foreground mb-1">{t("seasonWorkspace.details.duration")}</p>
              <p className="text-base text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                {formatDate(season?.startDate)} - {formatDate(season?.endDate ?? season?.plannedHarvestDate)}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-card acm-card-elevated acm-hover-surface">
              <p className="acm-body-text text-muted-foreground mb-1">{t("seasonWorkspace.details.upcomingTask")}</p>
              {upcomingTask ? (
                <p className="text-base text-foreground line-clamp-2">{upcomingTask}</p>
              ) : (
                <div 
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary cursor-pointer hover:underline mt-0.5"
                  onClick={() => setIsTaskDialogOpen(true)}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Thêm công việc</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex overflow-x-auto divide-x divide-border border-y border-border py-5 my-2 -mx-6 px-6">
            <MetricCard icon={ClipboardList} label={t("seasonWorkspace.metrics.pending")} value={pendingTasks} />
            <MetricCard icon={PackageCheck} label={t("seasonWorkspace.metrics.inProgress")} value={inProgressTasks} />
            <MetricCard icon={AlertCircle} label={t("seasonWorkspace.metrics.overdue")} value={overdueTasks} />
            <MetricCard icon={PackageCheck} label={t("seasonWorkspace.metrics.completed")} value={completedTasks} />
            <MetricCard icon={DollarSign} label={t("seasonWorkspace.metrics.expenses")} value={expensesCount} />
            <MetricCard icon={FileText} label={t("seasonWorkspace.metrics.logs")} value={logsCount} />
            <MetricCard icon={Wheat} label={t("seasonWorkspace.metrics.harvestBatches")} value={harvestCount} />
            <MetricCard icon={Sprout} label={t("seasonWorkspace.metrics.harvestedYield")} value={Math.round(totalHarvestedKg)} suffix={t("seasonWorkspace.units.kg")} />
          </div>

          <div className="rounded-xl border border-border p-4 bg-card acm-card-elevated acm-hover-surface">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-base text-foreground">{t("seasonWorkspace.harvestProgress.title")}</p>
              <p className="text-2xl font-semibold text-foreground">{harvestProgressPercent}%</p>
            </div>
            <Progress value={harvestProgressPercent} className="h-2" />
            <p className="acm-body-text text-muted-foreground mt-2">
              {expectedYieldKg > 0 
                ? t("seasonWorkspace.harvestProgress.summaryWithTarget", { harvestedKg: Math.round(totalHarvestedKg), targetKg: Math.round(expectedYieldKg) })
                : t("seasonWorkspace.harvestProgress.summary", { harvestedKg: Math.round(totalHarvestedKg) })
              }
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {WORKSPACE_MODULE_TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={`/farmer/seasons/${seasonIdNumber}/workspace/${tab.path}`}
          >
            {({ isActive }) => {
              const Icon = tab.icon;
              const translatedLabel = t(tab.labelKey);
              const label = translatedLabel === tab.labelKey ? tab.fallbackLabel : translatedLabel;
              return (
                <Button
                  variant="outline"
                  className={`rounded-xl border acm-hover-surface acm-body-text transition-all duration-200 ${isActive
                    ? "shadow-md opacity-100"
                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground opacity-90 hover:opacity-100"
                    }`}
                  style={isActive ? {
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    borderColor: 'var(--primary)',
                  } : undefined}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              );
            }}
          </NavLink>
        ))}
      </div>

      <CreateTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onCreateTask={handleQuickTaskCreate}
        seasonId={scopedSeasonId}
        hideSeasonSelector={true}
        uniquePlots={uniqueTaskPlots}
        assigneeOptions={taskAssigneeOptions}
      />

      <ExpenseFormModal
        isOpen={isAddExpenseOpen}
        setIsOpen={handleExpenseModalOpenChange}
        selectedExpense={selectedExpense}
        formData={expenseFormData}
        setFormData={setExpenseFormData}
        handleAddExpense={handleAddExpense}
        resetForm={resetExpenseForm}
        showValidationErrors={showExpenseValidationErrors}
        seasonOptions={seasonOptions}
        taskOptions={taskOptions}
        supplierOptions={supplierOptions}
        isLoadingTasks={isLoadingExpenseTasks}
        onTaskChange={handleExpenseTaskChange}
        isSeasonLocked={true}
        lockedSeasonLabel={season?.seasonName}
        isSubmitting={isExpenseCreating || isExpenseUpdating}
      />

      <Dialog
        open={isFieldLogDialogOpen}
        onOpenChange={(open) => {
          setIsFieldLogDialogOpen(open);
          if (!open) {
            resetFieldLogForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("fieldLogs.dialog.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("fieldLogs.dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-log-date">
                {t("fieldLogs.form.logDate")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="workspace-log-date"
                type="date"
                value={fieldLogFormData.logDate}
                onChange={(event) => setFieldLogFormData((prev) => ({ ...prev, logDate: event.target.value }))}
              />
              {season && (
                <p className="text-xs text-muted-foreground">
                  Season range: {formatDate(season.startDate)} - {formatDate(season.endDate ?? season.plannedHarvestDate)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-log-type">
                {t("fieldLogs.form.logType")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={fieldLogFormData.logType}
                onValueChange={(value) => setFieldLogFormData((prev) => ({ ...prev, logType: value }))}
              >
                <SelectTrigger id="workspace-log-type" className="rounded-xl border-border">
                  <SelectValue placeholder={t("fieldLogs.form.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {LOG_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-log-notes">{t("fieldLogs.form.notes")}</Label>
              <Textarea
                id="workspace-log-notes"
                rows={4}
                placeholder={t("fieldLogs.form.notesPlaceholder")}
                value={fieldLogFormData.notes}
                onChange={(event) => setFieldLogFormData((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsFieldLogDialogOpen(false);
                resetFieldLogForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmitFieldLog}
              disabled={createFieldLogMutation.isPending}
            >
              {createFieldLogMutation.isPending ? `${t("common.loading")}...` : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddBatchDialog
        open={isAddBatchOpen}
        onOpenChange={handleHarvestModalOpenChange}
        formData={harvestFormData}
        onFormChange={setHarvestFormData}
        onSubmit={handleAddBatch}
        seasonId={seasonIdNumber}
        isSeasonLocked={true}
        lockedSeasonLabel={season?.seasonName}
        isWriteLocked={isSeasonWriteLocked}
        warehouseCount={outputWarehouseCount}
        writeLockReason={seasonWriteLockReason}
        isSubmitting={isHarvestCreating}
        onCancel={() => {
          handleHarvestModalOpenChange(false);
          resetHarvestForm();
        }}
      />

      {isWorkspaceProcessing && (
        <div className="acm-page-loading-overlay" role="status" aria-live="polite" aria-label={workspaceBusyMessage}>
          <div className="acm-page-loading-card acm-body-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>{workspaceBusyMessage}</span>
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
}

interface MetricCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}

function MetricCard({ icon: Icon, label, value, suffix }: MetricCardProps) {
  return (
    <div className="flex flex-col justify-center px-5 shrink-0 first:pl-0 last:pr-0">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="acm-body-text whitespace-nowrap">{label}</span>
      </div>
      <p className="text-2xl font-medium text-foreground tracking-tight">
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </p>
    </div>
  );
}


