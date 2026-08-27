import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  plotApi,
  plotKeys,
  usePlots,
  useCreatePlot,
  useDeletePlot,
  useUpdatePlot,
  type PlotRequest,
} from "@/entities/plot";
import { farmKeys } from "@/entities/farm";
import { useLatestSoilTests } from "@/entities/soil-test";
import { normalizeSoilTypeCode } from "@/features/farmer/shared/plotOptions";
import type { Plot, PlotStatus, SplitPlotRequest, ViewMode } from "../types";
import { transformApiToFeature, mapPlotStatusToApiStatus } from "../utils";
import { usePlotFilters } from "./usePlotFilters";

const getCanonicalSoilType = (plot: Plot): string | undefined => {
  const code = normalizeSoilTypeCode(plot.soilType);
  if (code) return code;
  return plot.soilType && plot.soilType !== "Unknown" ? plot.soilType : undefined;
};

const PLOT_STATUS_CODES: NonNullable<PlotRequest["status"]>[] = [
  "IN_USE",
  "IDLE",
  "AVAILABLE",
  "FALLOW",
  "MAINTENANCE",
];

const getCanonicalPlotStatus = (plot: Plot): PlotRequest["status"] => {
  const statusCode = plot.statusCode as PlotRequest["status"] | undefined;
  if (statusCode && PLOT_STATUS_CODES.includes(statusCode)) {
    return statusCode;
  }
  return mapPlotStatusToApiStatus(plot.status);
};

const buildPlotStatusUpdatePayload = (
  plot: Plot,
  status: PlotRequest["status"]
): PlotRequest => ({
  plotName: plot.name,
  area: plot.area,
  soilType: getCanonicalSoilType(plot),
  status,
});

/**
 * Return type for the usePlotManagement hook
 */
export interface UsePlotManagementReturn {
  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Filter state (from usePlotFilters)
  filterCrop: string;
  setFilterCrop: (crop: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterSoilType: string;
  setFilterSoilType: (type: string) => void;

  // Filter options from API
  cropOptions: { value: string; label: string }[];
  soilTypeOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  isLoadingFilterOptions: boolean;

  // Data
  plots: Plot[];
  filteredPlots: Plot[];

  // Loading & Error states
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // UI state
  selectedPlot: Plot | null;
  setSelectedPlot: (plot: Plot | null) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isAddPlotOpen: boolean;
  setIsAddPlotOpen: (open: boolean) => void;
  isMergeWizardOpen: boolean;
  setIsMergeWizardOpen: (open: boolean) => void;
  isSplitDialogOpen: boolean;
  setIsSplitDialogOpen: (open: boolean) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  mergeStep: number;
  setMergeStep: (step: number) => void;
  selectedPlots: string[];
  setSelectedPlots: (plots: string[]) => void;
  plotToSplit: Plot | null;
  setPlotToSplit: (plot: Plot | null) => void;
  plotToDelete: string | null;
  setPlotToDelete: (id: string | null) => void;

  // Handlers
  handleClearFilters: () => void;
  handleViewPlotDetails: (plot: Plot) => void;
  handleAddPlot: (formData: PlotRequest) => void;
  handleDeletePlot: () => void;
  handleGenerateQR: (plot: Plot) => void;
  handleMarkDormant: (plot: Plot) => void;
  handleReactivatePlot: (plot: Plot) => void;
  handleOpenSplitPlot: (plot: Plot) => void;
  handleSplitPlot: (data: SplitPlotRequest) => void;
  handleMergePlots: (newPlotName: string) => void;
  handleToggleSelection: (id: string) => void;
  handleToggleAllSelection: () => void;
  handleBulkDelete: () => void;
  handleBulkStatusChange: (status: PlotStatus) => void;
  handleClearSelection: () => void;

  // Selection state
  isAllSelected: boolean;
  isSomeSelected: boolean;
  selectedCount: number;

  // Mutation states
  isCreating: boolean;
  isDeleting: boolean;
  isMerging: boolean;
  isSplitting: boolean;
}

/**
 * Custom hook for Plot Management state management and business logic
 *
 * Refactored to use:
 * - usePlotFilters: Filter state and options
 * - utils.ts: Transform functions
 */
export const usePlotManagement = (): UsePlotManagementReturn => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // ═══════════════════════════════════════════════════════════════
  // COMPOSED HOOKS
  // ═══════════════════════════════════════════════════════════════

  const filters = usePlotFilters();

  // ═══════════════════════════════════════════════════════════════
  // API HOOKS - PLOT DATA
  // ═══════════════════════════════════════════════════════════════

  const {
    data: apiPlots,
    isLoading,
    error,
    refetch
  } = usePlots();
  const plotIds = useMemo(
    () => (apiPlots ?? []).map((plot) => plot.id).filter((id): id is number => Number.isInteger(id) && id > 0),
    [apiPlots]
  );
  const {
    data: latestSoilTests,
    isLoading: isLoadingSoilTests,
    error: soilTestsError,
    refetch: refetchSoilTests,
  } = useLatestSoilTests(plotIds, { enabled: plotIds.length > 0 });

  const createMutation = useCreatePlot({
    onSuccess: () => {
      toast.success(t("plots.toast.createSuccess"), {
        description: t("plots.toast.createSuccessDesc"),
      });
      setIsAddPlotOpen(false);
    },
    onError: (err) => {
      toast.error(t("plots.toast.createError"), {
        description: err.message || t("common.error.description"),
      });
    },
  });

  const deleteMutation = useDeletePlot({
    onSuccess: () => {
      toast.success(t("plots.toast.deleteSuccess"), {
        description: t("plots.toast.deleteSuccessDesc"),
      });
      setIsDeleteDialogOpen(false);
      setPlotToDelete(null);
      if (selectedPlot?.id === plotToDelete) {
        setIsDrawerOpen(false);
      }
    },
    onError: (err) => {
      toast.error(t("plots.toast.deleteError"), {
        description: err.message || t("common.error.description"),
      });
    },
  });

  const updateMutation = useUpdatePlot({
    onSuccess: () => {
      toast.success(t("plots.toast.statusUpdateSuccess"));
    },
    onError: (err) => {
      toast.error(t("plots.toast.updateError"), {
        description: err.message || t("common.error.description"),
      });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ plotIds, newPlotName }: { plotIds: string[]; newPlotName: string }) => {
      const selectedPlotObjects = plotIds
        .map((id) => plots.find((plot) => plot.id === id))
        .filter((plot): plot is Plot => Boolean(plot));

      if (selectedPlotObjects.length < 2) {
        throw new Error(t("plots.toast.selectAtLeastTwo"));
      }

      if (selectedPlotObjects.length !== plotIds.length) {
        throw new Error(t("plots.toast.mergeMissingPlots"));
      }

      const farmId = selectedPlotObjects[0].farmId;
      if (!farmId) {
        throw new Error(t("plots.toast.mergeFarmMissing"));
      }

      const hasDifferentFarm = selectedPlotObjects.some((plot) => plot.farmId !== farmId);
      if (hasDifferentFarm) {
        throw new Error(t("plots.toast.mergeSameFarmRequired"));
      }

      const mergedSoilType = selectedPlotObjects
        .map(getCanonicalSoilType)
        .find((soilType): soilType is string => Boolean(soilType));

      const createdPlot = await plotApi.create({
        farmId,
        plotName: newPlotName,
        area: selectedPlotObjects.reduce((sum, plot) => sum + plot.area, 0),
        soilType: mergedSoilType,
        status: getCanonicalPlotStatus(selectedPlotObjects[0]),
      });

      try {
        await Promise.all(
          selectedPlotObjects.map((plot) => plotApi.delete(Number.parseInt(plot.id, 10)))
        );
      } catch (error) {
        await plotApi.delete(createdPlot.id).catch(() => undefined);
        throw error;
      }

      return {
        farmId,
        mergedCount: selectedPlotObjects.length,
      };
    },
    onSuccess: ({ farmId, mergedCount }) => {
      toast.success(t("plots.toast.mergeSuccess"), {
        description: t("plots.toast.mergeSuccessDesc", { count: mergedCount }),
      });
      setIsMergeWizardOpen(false);
      setSelectedPlots([]);
      setMergeStep(1);
      queryClient.invalidateQueries({ queryKey: plotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: plotKeys.byFarm(farmId), exact: false });
      queryClient.invalidateQueries({ queryKey: farmKeys.detail(farmId) });
    },
    onError: (error) => {
      toast.error(t("plots.toast.mergeError"), {
        description: error.message || t("common.error.description"),
      });
    },
  });

  const splitMutation = useMutation({
    mutationFn: async (data: SplitPlotRequest) => {
      const { sourcePlot, firstPlotName, firstArea, secondPlotName, secondArea } = data;
      const sourcePlotId = Number.parseInt(sourcePlot.id, 10);
      if (Number.isNaN(sourcePlotId)) {
        throw new Error(t("plots.toast.splitMissingPlot"));
      }

      const farmId = sourcePlot.farmId;
      if (!farmId) {
        throw new Error(t("plots.toast.splitFarmMissing"));
      }

      const soilType = getCanonicalSoilType(sourcePlot);
      const status = getCanonicalPlotStatus(sourcePlot);
      const createdPlotIds: number[] = [];

      try {
        const firstPlot = await plotApi.create({
          farmId,
          plotName: firstPlotName,
          area: firstArea,
          soilType,
          status,
        });
        createdPlotIds.push(firstPlot.id);

        const secondPlot = await plotApi.create({
          farmId,
          plotName: secondPlotName,
          area: secondArea,
          soilType,
          status,
        });
        createdPlotIds.push(secondPlot.id);

        await plotApi.delete(sourcePlotId);
      } catch (error) {
        await Promise.all(
          createdPlotIds.map((id) => plotApi.delete(id).catch(() => undefined))
        );
        throw error;
      }

      return {
        farmId,
        sourcePlotId,
        sourceName: sourcePlot.name,
      };
    },
    onSuccess: ({ farmId, sourcePlotId, sourceName }) => {
      toast.success(t("plots.toast.splitSuccess"), {
        description: t("plots.toast.splitSuccessDesc", { name: sourceName }),
      });
      setIsSplitDialogOpen(false);
      setPlotToSplit(null);
      queryClient.invalidateQueries({ queryKey: plotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: plotKeys.byFarm(farmId), exact: false });
      queryClient.invalidateQueries({ queryKey: plotKeys.detail(sourcePlotId) });
      queryClient.invalidateQueries({ queryKey: farmKeys.detail(farmId) });
    },
    onError: (error) => {
      toast.error(t("plots.toast.splitError"), {
        description: error.message || t("common.error.description"),
      });
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // VIEW STATE
  // ═══════════════════════════════════════════════════════════════

  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // UI state
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddPlotOpen, setIsAddPlotOpen] = useState(false);
  const [isMergeWizardOpen, setIsMergeWizardOpen] = useState(false);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [mergeStep, setMergeStep] = useState(1);
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [plotToSplit, setPlotToSplit] = useState<Plot | null>(null);
  const [plotToDelete, setPlotToDelete] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // TRANSFORMED DATA
  // ═══════════════════════════════════════════════════════════════

  const plots = useMemo(() => {
    if (apiPlots && apiPlots.length > 0) {
      const soilTestByPlot = new Map((latestSoilTests ?? []).map((item) => [item.plotId, item]));
      return apiPlots.map((plot) => transformApiToFeature(plot, soilTestByPlot.get(plot.id)));
    }
    return [];
  }, [apiPlots, latestSoilTests]);

  // Apply filters from usePlotFilters hook
  const filteredPlots = useMemo(
    () => filters.getFilteredPlots(plots),
    [filters, plots]
  );

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleClearFilters = useCallback(() => {
    filters.handleClearFilters();
    toast.info(t("plots.toast.filtersCleared"));
  }, [filters, t]);

  const handleViewPlotDetails = useCallback((plot: Plot) => {
    setSelectedPlot(plot);
    setIsDrawerOpen(true);
  }, []);

  const handleAddPlot = useCallback((formData: PlotRequest) => {
    // Validate required fields (dialog already validates, but double-check)
    if (!formData.farmId || !formData.plotName || !formData.area) {
      toast.error(t("plots.toast.missingRequiredFields"), {
        description: !formData.farmId
          ? t("farms.validation.farmRequired")
          : t("plots.toast.missingRequiredFieldsDesc"),
      });
      return;
    }

    // Use API mutation - formData is already in correct PlotRequest format
    createMutation.mutate(formData);
  }, [createMutation, t]);

  const handleDeletePlot = useCallback(() => {
    if (plotToDelete) {
      const plotId = parseInt(plotToDelete, 10);
      if (!isNaN(plotId)) {
        deleteMutation.mutate(plotId);
      }
    }
  }, [plotToDelete, deleteMutation]);

  const handleGenerateQR = useCallback((plot: Plot) => {
    toast.success(t("plots.toast.qrGenerated"), {
      description: t("plots.toast.qrGeneratedDesc", { name: plot.name }),
    });
  }, [t]);

  const handleMarkDormant = useCallback((plot: Plot) => {
    const plotId = parseInt(plot.id, 10);
    if (!isNaN(plotId)) {
      updateMutation.mutate({
        id: plotId,
        data: buildPlotStatusUpdatePayload(plot, "FALLOW"),
      });
    }
  }, [updateMutation]);

  const handleReactivatePlot = useCallback((plot: Plot) => {
    const plotId = parseInt(plot.id, 10);
    if (!isNaN(plotId)) {
      updateMutation.mutate({
        id: plotId,
        data: buildPlotStatusUpdatePayload(plot, "IN_USE"),
      });
    }
  }, [updateMutation]);

  const handleOpenSplitPlot = useCallback((plot: Plot) => {
    setPlotToSplit(plot);
    setIsSplitDialogOpen(true);
  }, []);

  const handleSplitPlot = useCallback((data: SplitPlotRequest) => {
    splitMutation.mutate(data);
  }, [splitMutation]);

  const handleMergePlots = useCallback((newPlotName: string) => {
    if (selectedPlots.length < 2) {
      toast.error(t("plots.toast.selectAtLeastTwo"));
      return;
    }

    mergeMutation.mutate({
      plotIds: selectedPlots,
      newPlotName,
    });
  }, [mergeMutation, selectedPlots, t]);

  // Bulk selection handlers
  const handleToggleSelection = useCallback((id: string) => {
    setSelectedPlots(prev =>
      prev.includes(id)
        ? prev.filter(plotId => plotId !== id)
        : [...prev, id]
    );
  }, []);

  const handleToggleAllSelection = useCallback(() => {
    if (selectedPlots.length === filteredPlots.length) {
      // Deselect all
      setSelectedPlots([]);
    } else {
      // Select all filtered plots
      setSelectedPlots(filteredPlots.map(p => p.id));
    }
  }, [selectedPlots, filteredPlots]);

  const handleBulkDelete = useCallback(() => {
    if (selectedPlots.length === 0) {
      toast.error(t("plots.toast.noPlotsSelected"));
      return;
    }

    // Delete each selected plot
    selectedPlots.forEach(id => {
      const plotId = parseInt(id, 10);
      if (!isNaN(plotId)) {
        deleteMutation.mutate(plotId);
      }
    });

    toast.success(t("plots.toast.bulkDeleteSuccess"), {
      description: t("plots.toast.bulkDeleteSuccessDesc", { count: selectedPlots.length }),
    });
    setSelectedPlots([]);
  }, [selectedPlots, deleteMutation, t]);

  const handleBulkStatusChange = useCallback((status: PlotStatus) => {
    if (selectedPlots.length === 0) {
      toast.error(t("plots.toast.noPlotsSelected"));
      return;
    }

    // Update each selected plot
    selectedPlots.forEach(id => {
      const plotId = parseInt(id, 10);
      const plot = plots.find(p => p.id === id);
      if (!isNaN(plotId) && plot) {
        updateMutation.mutate({
          id: plotId,
          data: buildPlotStatusUpdatePayload(plot, mapPlotStatusToApiStatus(status)),
        });
      }
    });

    toast.success(t("plots.toast.statusUpdateSuccess"), {
      description: t("plots.toast.bulkStatusUpdateSuccessDesc", {
        count: selectedPlots.length,
        status: t(`plots.status.${status === "at-risk" ? "atRisk" : status}`),
      }),
    });
    setSelectedPlots([]);
  }, [selectedPlots, plots, updateMutation, t]);

  const handleClearSelection = useCallback(() => {
    setSelectedPlots([]);
  }, []);

  // Selection state
  const isAllSelected = filteredPlots.length > 0 && selectedPlots.length === filteredPlots.length;
  const isSomeSelected = selectedPlots.length > 0 && selectedPlots.length < filteredPlots.length;
  const selectedCount = selectedPlots.length;

  return {
    // View state
    viewMode,
    setViewMode,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,

    // Filter state (from usePlotFilters)
    filterCrop: filters.filterCrop,
    setFilterCrop: filters.setFilterCrop,
    filterStatus: filters.filterStatus,
    setFilterStatus: filters.setFilterStatus,
    filterSoilType: filters.filterSoilType,
    setFilterSoilType: filters.setFilterSoilType,

    // Filter options from API
    cropOptions: filters.cropOptions,
    soilTypeOptions: filters.soilTypeOptions,
    statusOptions: filters.statusOptions,
    isLoadingFilterOptions: filters.isLoadingFilterOptions,

    // Data
    plots,
    filteredPlots,

    // Loading & Error states
    isLoading: isLoading || isLoadingSoilTests,
    error: error ?? soilTestsError ?? null,
    refetch: () => {
      void refetch();
      if (plotIds.length > 0) {
        void refetchSoilTests();
      }
    },

    // UI state
    selectedPlot,
    setSelectedPlot,
    isDrawerOpen,
    setIsDrawerOpen,
    isAddPlotOpen,
    setIsAddPlotOpen,
    isMergeWizardOpen,
    setIsMergeWizardOpen,
    isSplitDialogOpen,
    setIsSplitDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    mergeStep,
    setMergeStep,
    selectedPlots,
    setSelectedPlots,
    plotToSplit,
    setPlotToSplit,
    plotToDelete,
    setPlotToDelete,

    // Handlers
    handleClearFilters,
    handleViewPlotDetails,
    handleAddPlot,
    handleDeletePlot,
    handleGenerateQR,
    handleMarkDormant,
    handleReactivatePlot,
    handleOpenSplitPlot,
    handleSplitPlot,
    handleMergePlots,
    handleToggleSelection,
    handleToggleAllSelection,
    handleBulkDelete,
    handleBulkStatusChange,
    handleClearSelection,

    // Selection state
    isAllSelected,
    isSomeSelected,
    selectedCount,

    // Mutation states
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMerging: mergeMutation.isPending,
    isSplitting: splitMutation.isPending,
  };
};



