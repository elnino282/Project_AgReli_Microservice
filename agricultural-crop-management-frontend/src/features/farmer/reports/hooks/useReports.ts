import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import type {
  ExportFormat,
  FilterState,
  PesticideStatus,
  PesticideRecord,
  ReportSection,
  TaskPerformance,
  YieldByCrop,
  YieldByPlot,
  YieldBySeason,
  YieldViewMode,
} from "../types";
import { DEFAULT_FILTERS } from "../constants";
// eslint-disable-next-line no-restricted-imports -- keep legacy reports client until dedicated FSD entity API is introduced
import { farmerReportsApi } from "@/entities/user/api/api.farmer";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useSeason } from "@/shared/contexts";
import { taskApi } from "@/entities/task";
import { fieldLogApi } from "@/entities/field-log";

interface UseReportsOptions {
  seasonId?: number;
  initialSeasonValue?: string;
}

const toReadableApiError = (error: unknown, fallback: string, t: (key: string) => string) => {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { code?: string; message?: string } | undefined;
    const status = error.response?.status;
    const code = payload?.code;

    if (status === 401 || code === "ERR_UNAUTHENTICATED" || code === "ERR_UNAUTHORIZED") {
      return t("reports.apiErrors.sessionExpired");
    }
    if (status === 403 || code === "ERR_FORBIDDEN" || code === "NOT_OWNER") {
      return t("reports.apiErrors.noPermission");
    }
    if (status === 400 || code === "ERR_KEY_INVALID") {
      return payload?.message || t("reports.apiErrors.invalidRequest");
    }
    if (typeof payload?.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const toMonthLabel = (dateValue?: string | null) => {
  if (!dateValue) return "No date";
  const normalizedDate = dateValue.includes("T") ? dateValue : `${dateValue}T00:00:00`;
  const date = new Date(normalizedDate);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
};

const compareMonthLabels = (left: string, right: string) => {
  if (left === "No date") return 1;
  if (right === "No date") return -1;
  return new Date(`1 ${left}`).getTime() - new Date(`1 ${right}`).getTime();
};

export function useReports(options: UseReportsOptions = {}) {
  const { seasonId: explicitSeasonId, initialSeasonValue } = options;
  const { selectedSeasonId } = useSeason();
  const { t, locale } = useI18n();
  const resolvedSeasonId = explicitSeasonId ?? selectedSeasonId ?? null;

  const [activeSection, setActiveSection] = useState<ReportSection>("yield");
  const [selectedSeason, setSelectedSeason] = useState(
    initialSeasonValue ?? (resolvedSeasonId ? String(resolvedSeasonId) : "all")
  );
  const [yieldViewMode, setYieldViewMode] = useState<YieldViewMode>("season");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    if (!initialSeasonValue) return;
    if (selectedSeason === initialSeasonValue) return;
    setSelectedSeason(initialSeasonValue);
  }, [initialSeasonValue, selectedSeason]);

  const queryEnabled = resolvedSeasonId !== null;

  const {
    data: yieldReport,
    isLoading: yieldLoading,
    error: yieldError,
  } = useQuery({
    queryKey: ["farmerReports", "yield", resolvedSeasonId],
    queryFn: () => farmerReportsApi.getYieldReport(resolvedSeasonId as number),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: costReport,
    isLoading: costLoading,
    error: costError,
  } = useQuery({
    queryKey: ["farmerReports", "cost", resolvedSeasonId],
    queryFn: () => farmerReportsApi.getCostReport(resolvedSeasonId as number),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: revenueReport,
    isLoading: revenueLoading,
    error: revenueError,
  } = useQuery({
    queryKey: ["farmerReports", "revenue", resolvedSeasonId],
    queryFn: () => farmerReportsApi.getRevenueReport(resolvedSeasonId as number),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: profitReport,
    isLoading: profitLoading,
    error: profitError,
  } = useQuery({
    queryKey: ["farmerReports", "profit", resolvedSeasonId],
    queryFn: () => farmerReportsApi.getProfitReport(resolvedSeasonId as number),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: seasonTaskPage,
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: ["farmerReports", "tasks", resolvedSeasonId],
    queryFn: () =>
      taskApi.listBySeason(resolvedSeasonId as number, {
        page: 0,
        size: 500,
        sortBy: "dueDate",
        sortDirection: "asc",
      }),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: sprayLogPage,
    isLoading: pesticideLoading,
    error: pesticideError,
  } = useQuery({
    queryKey: ["farmerReports", "pesticide", "sprayLogs", resolvedSeasonId],
    queryFn: () =>
      fieldLogApi.listBySeason(resolvedSeasonId as number, {
        type: "SPRAY",
        page: 0,
        size: 500,
      }),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
  });



  const yieldBySeason: YieldBySeason[] = useMemo(() => {
    if (!yieldReport) return [];
    return yieldReport.map((item) => ({
      season: item.seasonName || `Season ${item.seasonId}`,
      yield: Number(item.actualYieldKg) || 0,
      avgYield: Number(item.expectedYieldKg) || 0,
    }));
  }, [yieldReport]);

  const yieldByCrop: YieldByCrop[] = useMemo(() => {
    if (!yieldReport) return [];
    const cropMap = new Map<string, { expected: number; actual: number }>();
    yieldReport.forEach((item) => {
      const crop = item.cropName || "Unknown";
      const existing = cropMap.get(crop) || { expected: 0, actual: 0 };
      cropMap.set(crop, {
        expected: existing.expected + (Number(item.expectedYieldKg) || 0),
        actual: existing.actual + (Number(item.actualYieldKg) || 0),
      });
    });
    return Array.from(cropMap.entries()).map(([crop, data]) => ({
      crop,
      yield: data.actual,
      target: data.expected,
    }));
  }, [yieldReport]);

  const yieldByPlot: YieldByPlot[] = useMemo(() => {
    if (!yieldReport) return [];
    const plotMap = new Map<string, { actual: number }>();
    yieldReport.forEach((item) => {
      const plot = item.plotName || "Unknown";
      const existing = plotMap.get(plot) || { actual: 0 };
      plotMap.set(plot, {
        actual: existing.actual + (Number(item.actualYieldKg) || 0),
      });
    });
    return Array.from(plotMap.entries()).map(([plot, data]) => ({
      plot,
      yield: data.actual,
      area: 0,
    }));
  }, [yieldReport]);

  const kpiData = useMemo(() => {
    const hasYieldReport = (yieldReport?.length ?? 0) > 0;
    const hasCostReport = (costReport?.length ?? 0) > 0;
    const hasRevenueReport = (revenueReport?.length ?? 0) > 0;
    const hasProfitReport = (profitReport?.length ?? 0) > 0;

    const totalYieldKg = hasYieldReport
      ? yieldReport!.reduce((sum, item) => sum + (Number(item.actualYieldKg) || 0), 0)
      : undefined;

    const totalCost = hasCostReport
      ? costReport!.reduce((sum, item) => sum + (Number(item.totalExpense) || 0), 0)
      : undefined;

    const totalRevenue = hasRevenueReport
      ? revenueReport!.reduce((sum, item) => sum + (Number(item.totalRevenue) || 0), 0)
      : undefined;

    const netProfit = hasProfitReport
      ? profitReport!.reduce((sum, item) => sum + (Number(item.grossProfit) || 0), 0)
      : totalRevenue !== undefined && totalCost !== undefined
        ? totalRevenue - totalCost
        : undefined;

    const completedTasks = (seasonTaskPage?.items ?? []).filter((task) => task.status === "DONE");
    const onTimeCompletedTasks = completedTasks.filter((task) => {
      if (!task.actualEndDate) return false;
      if (!task.dueDate) return true;
      return task.actualEndDate <= task.dueDate;
    });

    const onTimeTasksPercent =
      completedTasks.length > 0
        ? Math.round((onTimeCompletedTasks.length / completedTasks.length) * 100)
        : undefined;

    return {
      totalYieldKg,
      totalCost,
      netProfit,
      onTimeTasksPercent,
    };
  }, [costReport, profitReport, revenueReport, seasonTaskPage?.items, yieldReport]);

  const taskPerformance: TaskPerformance[] = useMemo(() => {
    const tasks = seasonTaskPage?.items ?? [];
    const monthMap = new Map<string, TaskPerformance>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach((task) => {
      const month = toMonthLabel(task.actualEndDate ?? task.dueDate ?? task.plannedDate ?? task.createdAt);
      const current = monthMap.get(month) ?? {
        month,
        onTime: 0,
        late: 0,
        overdue: 0,
      };

      if (task.status === "DONE") {
        if (!task.dueDate || (task.actualEndDate && task.actualEndDate <= task.dueDate)) {
          current.onTime += 1;
        } else {
          current.late += 1;
        }
      } else if (task.status === "OVERDUE") {
        current.overdue += 1;
      } else if (task.dueDate) {
        const dueDate = new Date(`${task.dueDate}T00:00:00`);
        if (!Number.isNaN(dueDate.getTime()) && dueDate < today) {
          current.overdue += 1;
        }
      }

      monthMap.set(month, current);
    });

    return Array.from(monthMap.values()).sort((left, right) =>
      compareMonthLabels(left.month, right.month)
    );
  }, [seasonTaskPage?.items]);

  const pesticideRecords: PesticideRecord[] = useMemo(() => {
    const sprayLogs = sprayLogPage?.items ?? [];
    return sprayLogs.map((log) => ({
      id: log.id,
      lotId: `Log #${log.id}`,
      chemical: null,
      quantity: null,
      unit: null,
      phi: null,
      daysRemaining: null,
      status: "review",
      appliedAt: log.logDate,
      notes: log.notes ?? null,
    }));
  }, [resolvedSeasonId, sprayLogPage?.items]);

  const isLoading =
    yieldLoading ||
    costLoading ||
    revenueLoading ||
    profitLoading ||
    tasksLoading ||
    pesticideLoading;
  const hasError = Boolean(
    yieldError ||
    costError ||
    revenueError ||
    profitError ||
    tasksError ||
    pesticideError
  );

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsExportModalOpen(false);
      toast.success(t("reports.toast.exportSuccess"), {
        description: t("reports.toast.exportDescription", { format: exportFormat.toUpperCase() }),
      });
    }, 2000);
  };

  const handleApplyFilters = () => {
    setIsFilterDrawerOpen(false);
    toast.success(t("reports.toast.filtersApplied"), {
      description: t("reports.toast.filtersAppliedDescription"),
    });
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    toast.info(t("reports.toast.filtersCleared"), {
      description: t("reports.toast.filtersClearedDescription"),
    });
  };

  const getYieldChartData = () => {
    switch (yieldViewMode) {
      case "season":
        return yieldBySeason;
      case "crop":
        return yieldByCrop;
      case "plot":
        return yieldByPlot;
      default:
        return yieldBySeason;
    }
  };

  const getPesticideStatusBadge = (status: PesticideStatus) => {
    const statusConfig = {
      safe: {
        className: "bg-primary/10 text-primary border-primary/20",
        label: t("reports.pesticide.statusSafe"),
      },
      approaching: {
        className: "bg-accent/10 text-accent border-accent/20",
        label: t("reports.pesticide.statusApproaching"),
      },
      violated: {
        className: "bg-destructive/10 text-destructive border-destructive/20",
        label: t("reports.pesticide.statusViolated"),
      },
      review: {
        className: "bg-muted text-muted-foreground border-border",
        label: t("reports.pesticide.statusReview"),
      },
    };

    return statusConfig[status];
  };

  return {
    activeSection,
    selectedSeason,
    yieldViewMode,
    isFilterDrawerOpen,
    isExportModalOpen,
    isExporting,
    exportFormat,
    includeCharts,
    includeNotes,
    filters,
    yieldReport: yieldReport ?? [],
    costReport: costReport ?? [],
    revenueReport: revenueReport ?? [],
    profitReport: profitReport ?? [],
    taskPerformance,
    pesticideRecords,
    kpiData,
    isLoading,
    hasError,
    setActiveSection,
    setSelectedSeason,
    setYieldViewMode,
    setIsFilterDrawerOpen,
    setIsExportModalOpen,
    setExportFormat,
    setIncludeCharts,
    setIncludeNotes,
    setFilters,
    handleExport,
    handleApplyFilters,
    handleClearFilters,
    getYieldChartData,
    getPesticideStatusBadge,
  };
}
