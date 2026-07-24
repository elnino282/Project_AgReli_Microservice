import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Clock, Package } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { toast } from "sonner";
import {
  useAllFarmerHarvests,
  useCreateHarvest,
  useDeleteHarvest,
  useHarvestSummary,
  useUpdateHarvest,
  type Harvest as ApiHarvest,
} from "@/entities/harvest";
import { useOptionalSeason } from "@/shared/contexts";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useQuery } from "@tanstack/react-query";
import { seasonsApi } from "@/entities/season/api/seasonsApi";
import type {
  CropResidueHandling,
  HarvestBatch,
  HarvestFormData,
  HarvestGrade,
  HarvestStatus,
  ChartDataPoint,
  SummaryStats,
} from "../types";
import { GRADE_DISTRIBUTION_COLORS, GRADE_POINTS_MAP } from "../constants";

type Translate = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

const INITIAL_FORM_DATA: HarvestFormData = {
  batchId: "",
  date: "",
  quantity: "",
  grade: "A",
  moisture: "",
  season: "",
  plot: "",
  plotName: "",
  crop: "",
  warehouseId: "",
  locationId: "",
  productId: "",
  productName: "",
  productVariant: "",
  lotCode: "",
  inventoryUnit: "kg",
  status: "stored",
  notes: "",
  purity: "",
  foreignMatter: "",
  brokenGrains: "",
  harvestLoss: "",
  cropResidueHandling: "",
  qualityGrade: "PASSED",
};

const parseSeasonId = (value?: string | number | null): number | undefined => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return undefined;
};

const getSafeNumber = (value: number | null | undefined, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const parseHarvestGrade = (value?: string | null): HarvestGrade | undefined => {
  if (value === "Premium" || value === "A" || value === "B" || value === "C") {
    return value;
  }
  return undefined;
};

const parseHarvestStatus = (value?: string | null): HarvestStatus | undefined => {
  if (value === "stored" || value === "sold" || value === "processing") {
    return value;
  }
  return undefined;
};

const getSeasonStatusLabel = (status: string | null | undefined, t: Translate): string => {
  switch (status) {
    case "PLANNED":
      return t("seasonWorkspace.status.planned", "Planned");
    case "ACTIVE":
      return t("seasonWorkspace.status.active", "Active");
    case "COMPLETED":
      return t("seasonWorkspace.status.completed", "Completed");
    case "CANCELLED":
      return t("seasonWorkspace.status.cancelled", "Cancelled");
    case "ARCHIVED":
      return t("seasonWorkspace.status.archived", "Archived");
    default:
      return t("seasonWorkspace.status.unknown", "Unknown");
  }
};

const normalizeToken = (value: string, fallback: string): string => {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return normalized || fallback;
};

const resolveDateToken = (value?: string): string => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.replace(/-/g, "");
  }
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
};

const generateAutoLotCode = (
  seasonId: number | undefined,
  productName: string,
  harvestDate: string,
): string => {
  const seasonToken = seasonId ? String(seasonId) : "GEN";
  const productToken = normalizeToken(productName, "CROP");
  const dateToken = resolveDateToken(harvestDate);
  const suffix = Date.now().toString().slice(-4);
  return `LOT-${seasonToken}-${productToken}-${dateToken}-${suffix}`;
};

const parseOptionalPercentage = (
  rawValue: string,
  label: string,
  t: Translate,
): number | undefined => {
  const normalized = rawValue.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(t("harvests.validation.percentageRange", {
      field: label,
      defaultValue: `${label} must be between 0 and 100`,
    }));
  }
  return parsed;
};

const appendMetadataToNote = (
  note: string,
  metadata: Record<string, string | number | undefined>,
): string | undefined => {
  const metadataLines = Object.entries(metadata)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);

  const trimmedNote = note.trim();
  if (metadataLines.length === 0) {
    return trimmedNote || undefined;
  }

  const metadataBlock = ["[harvest-metadata]", ...metadataLines].join("\n");
  if (!trimmedNote) {
    return metadataBlock;
  }
  return `${trimmedNote}\n\n${metadataBlock}`;
};

const splitNoteMetadata = (
  note?: string | null,
): { note: string; metadata: Record<string, string> } => {
  if (!note) {
    return { note: "", metadata: {} };
  }
  const marker = "[harvest-metadata]";
  const markerIndex = note.indexOf(marker);
  if (markerIndex < 0) {
    return { note, metadata: {} };
  }

  const metadata: Record<string, string> = {};
  const visibleNote = note.slice(0, markerIndex).trim();
  note
    .slice(markerIndex + marker.length)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) return;
      metadata[line.slice(0, separatorIndex)] = line.slice(separatorIndex + 1);
    });
  return { note: visibleNote, metadata };
};

const escapeCsvCell = (value: unknown): string => {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replace(/"/g, "\"\"")}"`;
};

const escapeHtml = (value: unknown): string => {
  const normalized = value == null ? "" : String(value);
  return normalized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const transformApiToFeature = (h: ApiHarvest): HarvestBatch => ({
  id: String(h.id),
  batchId: String(h.id),
  seasonId: h.seasonId ?? undefined,
  seasonName: h.seasonName ?? undefined,
  date: h.harvestDate,
  createdAt: h.createdAt ?? undefined,
  quantity: h.quantity,
  unitPrice: h.unit ?? undefined,
  revenue: h.revenue ?? undefined,
  grade: parseHarvestGrade(h.grade),
  status: parseHarvestStatus(h.status),
  notes: h.note ?? undefined,
  season:
    h.seasonName ??
    (h.seasonId && Number.isFinite(h.seasonId) ? `#${h.seasonId}` : undefined),
});

export function useHarvestManagement() {
  const { t, locale } = useI18n();
  const seasonContext = useOptionalSeason();

  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<HarvestBatch | null>(null);
  const [editingBatch, setEditingBatch] = useState<HarvestBatch | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<HarvestFormData>(INITIAL_FORM_DATA);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const effectiveSeasonId = useMemo((): number | undefined => {
    if (selectedSeason !== "all") {
      return parseSeasonId(selectedSeason);
    }
    return parseSeasonId(seasonContext?.selectedSeasonId ?? undefined);
  }, [selectedSeason, seasonContext?.selectedSeasonId]);

  const harvestParams = useMemo(
    () => ({
      page: 0,
      size: 100,
      ...(effectiveSeasonId ? { seasonId: effectiveSeasonId } : {}),
    }),
    [effectiveSeasonId]
  );

  const {
    data: apiData,
    isLoading: apiLoading,
    error: apiError,
    refetch,
  } = useAllFarmerHarvests(harvestParams);

  const { data: summaryData } = useHarvestSummary(effectiveSeasonId);

  const { data: activePHI } = useQuery({
    queryKey: ["season-phi", effectiveSeasonId],
    queryFn: () => seasonsApi.getActivePHI(effectiveSeasonId!),
    enabled: !!effectiveSeasonId,
  });

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setEditingBatch(null);
  }, []);

  const createMutation = useCreateHarvest({
    onSuccess: (_created, variables) => {
      toast.success(t("harvests.toast.harvestAdded", "Harvest Added"), {
        description: t("harvests.toast.harvestAddedDescription", {
          lotCode: variables.data.lotCode,
          quantity: variables.data.quantity,
          unit: "kg",
          defaultValue: `${variables.data.lotCode} - ${variables.data.quantity} kg`,
        }),
      });
      setIsAddBatchOpen(false);
      setEditingBatch(null);
      resetForm();
    },
    onError: (err) =>
      toast.error(t("harvests.toast.addFailed", "Failed to add harvest"), { description: err.message }),
  });

  const updateMutation = useUpdateHarvest({
    onSuccess: () => {
      toast.success(t("harvests.toast.updateSuccess", "Harvest updated successfully"));
      setIsAddBatchOpen(false);
      setEditingBatch(null);
      resetForm();
    },
    onError: (err) =>
      toast.error(t("harvests.toast.error", "An error occurred"), { description: err.message }),
  });

  const deleteMutation = useDeleteHarvest();

  const batches = useMemo(
    () => apiData?.items?.map(transformApiToFeature) ?? [],
    [apiData]
  );

  useEffect(() => {
    setSelectedBatchIds((previous) =>
      previous.filter((id) => batches.some((batch) => batch.id === id))
    );
  }, [batches]);

  const filteredBatches = batches;

  const totalHarvested = useMemo(() => {
    if (typeof summaryData?.totalHarvestedKg === "number") {
      return summaryData.totalHarvestedKg;
    }
    return filteredBatches.reduce((sum, batch) => sum + batch.quantity, 0);
  }, [filteredBatches, summaryData?.totalHarvestedKg]);

  const lotsCount = typeof summaryData?.lotsCount === "number"
    ? summaryData.lotsCount
    : filteredBatches.length;

  const avgGrade = useMemo(() => {
    const gradedBatches = batches.filter((batch) => !!batch.grade);
    if (gradedBatches.length === 0) return t("common.notAvailable", "N/A");
    const avg =
      gradedBatches.reduce(
        (sum, batch) => sum + GRADE_POINTS_MAP[batch.grade as HarvestGrade],
        0
      ) / gradedBatches.length;
    if (avg >= 3.5) return t("harvests.grades.premium", "Premium");
    if (avg >= 2.5) return t("harvests.grades.a", "Grade A");
    if (avg >= 1.5) return t("harvests.grades.b", "Grade B");
    return t("harvests.grades.c", "Grade C");
  }, [batches, t]);

  const avgMoisture = useMemo(() => {
    const moistureSamples = filteredBatches
      .map((batch) => batch.moisture)
      .filter((value): value is number => typeof value === "number");
    if (moistureSamples.length === 0) return "—";
    const average =
      moistureSamples.reduce((sum, value) => sum + value, 0) /
      moistureSamples.length;
    return average.toFixed(1);
  }, [filteredBatches]);

  const yieldVsPlan = useMemo(() => {
    const value = summaryData?.yieldVsPlanPercent;
    if (typeof value !== "number" || Number.isNaN(value)) return "—";
    return value.toFixed(1);
  }, [summaryData?.yieldVsPlanPercent]);

  const dailyTrend: ChartDataPoint[] = useMemo(() => {
    const dateMap: Record<string, number> = {};
    filteredBatches.forEach((batch) => {
      if (!batch.date) return;
      const dateObj = new Date(batch.date);
      const formattedDate = dateObj.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      });
      dateMap[formattedDate] = (dateMap[formattedDate] || 0) + batch.quantity;
    });
    return Object.entries(dateMap)
      .map(([date, quantity]) => ({ date, quantity }))
      .sort((left, right) => {
        const leftDate = new Date(left.date ?? "").getTime();
        const rightDate = new Date(right.date ?? "").getTime();
        return leftDate - rightDate;
      });
  }, [filteredBatches, locale]);

  const gradeDistribution: ChartDataPoint[] = useMemo(
    () =>
      [
        {
          name: t("harvests.grades.premium", "Premium"),
          value: batches.filter((batch) => batch.grade === "Premium").length,
          color: GRADE_DISTRIBUTION_COLORS.Premium,
        },
        {
          name: t("harvests.grades.a", "Grade A"),
          value: batches.filter((batch) => batch.grade === "A").length,
          color: GRADE_DISTRIBUTION_COLORS.A,
        },
        {
          name: t("harvests.grades.b", "Grade B"),
          value: batches.filter((batch) => batch.grade === "B").length,
          color: GRADE_DISTRIBUTION_COLORS.B,
        },
        {
          name: t("harvests.grades.c", "Grade C"),
          value: batches.filter((batch) => batch.grade === "C").length,
          color: GRADE_DISTRIBUTION_COLORS.C,
        },
      ].filter((entry) => (entry.value ?? 0) > 0),
    [batches, t]
  );

  const premiumGradePercentageFallback = useMemo(
    () =>
      batches.length > 0
        ? (batches.filter((batch) => batch.grade === "Premium").length /
            batches.length) *
          100
        : 0,
    [batches]
  );

  const summaryStats: SummaryStats = useMemo(
    () => ({
      totalStored: getSafeNumber(summaryData?.totalStoredKg),
      totalSold: getSafeNumber(summaryData?.totalSoldKg),
      totalProcessing: getSafeNumber(summaryData?.totalProcessingKg),
      premiumGradePercentage: getSafeNumber(
        summaryData?.premiumGradePercentage,
        premiumGradePercentageFallback
      ),
    }),
    [
      premiumGradePercentageFallback,
      summaryData?.premiumGradePercentage,
      summaryData?.totalProcessingKg,
      summaryData?.totalSoldKg,
      summaryData?.totalStoredKg,
    ]
  );

  const getStatusBadge = useCallback((status?: HarvestStatus | null) => {
    if (!status) return null;
    const badges: Record<HarvestStatus, JSX.Element> = {
      stored: (
        <Badge className="bg-secondary/10 text-secondary border-secondary/20">
          <Package className="w-3 h-3 mr-1" />
          {t("harvests.status.stored", "Stored")}
        </Badge>
      ),
      sold: (
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {t("harvests.status.sold", "Sold")}
        </Badge>
      ),
      processing: (
        <Badge className="bg-accent/10 text-foreground border-accent/20">
          <Clock className="w-3 h-3 mr-1" />
          {t("harvests.status.processing", "Processing")}
        </Badge>
      ),
      PENDING_RECEIPT: (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          {t("harvests.status.pending_receipt", "Chờ nhập kho")}
        </Badge>
      ),
      RECEIVED: (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {t("harvests.status.received", "Đã nhập kho")}
        </Badge>
      ),
    };
    return badges[status] ?? null;
  }, [t]);

  const getGradeBadge = useCallback((grade?: HarvestGrade | null) => {
    if (!grade) {
      return <span className="text-xs text-muted-foreground">{t("common.notAvailable", "—")}</span>;
    }
    const labels: Record<HarvestGrade, string> = {
      Premium: t("harvests.grades.premium", "Premium"),
      A: t("harvests.grades.a", "Grade A"),
      B: t("harvests.grades.b", "Grade B"),
      C: t("harvests.grades.c", "Grade C"),
    };
    const classes: Record<HarvestGrade, string> = {
      Premium: "bg-primary/10 text-primary border-primary/20",
      A: "bg-secondary/10 text-secondary border-secondary/20",
      B: "bg-accent/10 text-foreground border-accent/20",
      C: "bg-muted/30 text-muted-foreground border-border",
    };
    return (
      <Badge className={classes[grade]}>
        <Award className="w-3 h-3 mr-1" />
        {labels[grade]}
      </Badge>
    );
  }, [t]);

  const resolveSubmitSeasonId = useCallback(() => {
    const fromForm = parseSeasonId(formData.season);
    if (fromForm) return fromForm;
    return effectiveSeasonId;
  }, [effectiveSeasonId, formData.season]);

  const handleAddBatch = useCallback(() => {
    const isEditing = !!editingBatch;
    if (
      !formData.date ||
      !formData.quantity ||
      (!isEditing && (!formData.warehouseId || !formData.productName))
    ) {
      toast.error(t("harvests.validation.missingFields", "Missing Fields"));
      return;
    }

    const quantityDisplay = Number(formData.quantity);
    if (!Number.isFinite(quantityDisplay) || quantityDisplay <= 0) {
      toast.error(t("harvests.validation.invalidQuantity", "Invalid quantity"));
      return;
    }

    // Client-side PHI validation
    if (activePHI && activePHI.length > 0 && formData.date) {
      const selectedDate = new Date(formData.date);
      selectedDate.setHours(0, 0, 0, 0);

      const violations = activePHI.filter((record: any) => {
        if (!record.harvestAllowedDate) return false;
        const allowedDate = new Date(record.harvestAllowedDate);
        allowedDate.setHours(0, 0, 0, 0);
        return selectedDate < allowedDate;
      });

      if (violations.length > 0) {
        const detail = violations
          .map((v: any) => `${v.pesticideName} (cách ly đến ${v.harvestAllowedDate})`)
          .join(", ");

        toast.error(
          "THU HOẠCH BỊ CHẶN: Chưa hết thời gian cách ly",
          {
            description: `Còn ${violations.length} thuốc BVTV chưa hết cách ly. Danh sách: ${detail}`,
          }
        );
        return;
      }
    }

    const seasonId = isEditing
      ? parseSeasonId(editingBatch?.seasonId ?? effectiveSeasonId)
      : resolveSubmitSeasonId();
    if (!isEditing && !seasonId) {
      toast.error(t("harvests.validation.seasonRequired", "Season required"), {
        description: t(
          "harvests.validation.seasonRequiredDescription",
          "Select a valid season before adding harvest.",
        ),
      });
      return;
    }

    const selectedSeasonMeta = seasonContext?.seasons.find(
      (season) => season.id === seasonId
    );
    const plotIdFromForm = Number(formData.plot);
    const selectedPlotId =
      Number.isFinite(plotIdFromForm) && plotIdFromForm > 0
        ? plotIdFromForm
        : selectedSeasonMeta?.plotId;
    const selectedSeasonStatus = selectedSeasonMeta?.status;
    if ((!isEditing && selectedSeasonStatus !== "ACTIVE") || (isEditing && selectedSeasonStatus && selectedSeasonStatus !== "ACTIVE")) {
      toast.error(t("harvests.validation.seasonMustBeActive", "Season must be ACTIVE"), {
        description: t("harvests.validation.seasonMustBeActiveDescription", {
          status: getSeasonStatusLabel(selectedSeasonStatus, t),
          defaultValue: `Current status: ${getSeasonStatusLabel(selectedSeasonStatus, t)}. Start the season before recording harvest.`,
        }),
      });
      return;
    }

    if (!isEditing && (!selectedPlotId || !Number.isFinite(selectedPlotId) || selectedPlotId <= 0)) {
      toast.error(t("harvests.validation.plotRequired", "Harvest plot required"), {
        description: t(
          "harvests.validation.plotRequiredDescription",
          "Selected season is missing a valid plot link.",
        ),
      });
      return;
    }

    let moisturePercent: number | undefined;
    let purityPercent: number | undefined;
    let foreignMatterPercent: number | undefined;
    let brokenGrainsPercent: number | undefined;
    let harvestLossPercent: number | undefined;

    try {
      moisturePercent = parseOptionalPercentage(
        formData.moisture,
        t("harvests.addBatch.fields.moisture", "Moisture %"),
        t,
      );
      purityPercent = parseOptionalPercentage(
        formData.purity,
        t("harvests.addBatch.fields.purity", "Purity %"),
        t,
      );
      foreignMatterPercent = parseOptionalPercentage(
        formData.foreignMatter,
        t("harvests.addBatch.fields.foreignMatter", "Foreign Matter %"),
        t,
      );
      brokenGrainsPercent = parseOptionalPercentage(
        formData.brokenGrains,
        t("harvests.addBatch.fields.brokenGrains", "Broken Grains %"),
        t,
      );
      harvestLossPercent = parseOptionalPercentage(
        formData.harvestLoss,
        t("harvests.addBatch.fields.harvestLoss", "Harvest Loss %"),
        t,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(
              "harvests.validation.invalidPercentageFields",
              "Percentage fields contain invalid values.",
            );
      toast.error(message);
      return;
    }

    const warehouseId = Number(formData.warehouseId);
    const locationId = formData.locationId
      ? Number(formData.locationId)
      : undefined;
    const productId = formData.productId ? Number(formData.productId) : undefined;

    if (!isEditing && (!Number.isFinite(warehouseId) || warehouseId <= 0)) {
      toast.error(t("harvests.validation.invalidWarehouse", "Invalid warehouse"));
      return;
    }

    const residueHandling = formData.cropResidueHandling.trim() as CropResidueHandling | "";
    const lotCode = formData.lotCode.trim() || generateAutoLotCode(
      seasonId,
      formData.productName,
      formData.date,
    );

    const noteWithMetadata = appendMetadataToNote(formData.notes, {
      harvestPlotId: selectedPlotId,
      moisturePercent,
      purityPercent,
      foreignMatterPercent,
      brokenGrainsPercent,
      harvestLossPercent,
      cropResidueHandling: residueHandling || undefined,
    });

    if (isEditing) {
      const batchId = Number(editingBatch?.id);
      if (!Number.isFinite(batchId) || batchId <= 0) {
        toast.error(t("harvests.validation.invalidBatchId", "Invalid batch id"));
        return;
      }
      updateMutation.mutate({
        id: batchId,
        seasonId,
        data: {
          harvestDate: formData.date,
          quantity: quantityDisplay,
          unit:
            editingBatch?.unitPrice && Number.isFinite(editingBatch.unitPrice) && editingBatch.unitPrice > 0
              ? editingBatch.unitPrice
              : 1,
          grade: formData.grade,
          note: noteWithMetadata,
        },
      });
      return;
    }

    createMutation.mutate({
      seasonId: seasonId!,
      data: {
        harvestDate: formData.date,
        quantity: quantityDisplay,
        unit: 1,
        warehouseId,
        locationId:
          locationId && Number.isFinite(locationId) && locationId > 0
            ? locationId
            : undefined,
        productId:
          productId && Number.isFinite(productId) && productId > 0
            ? productId
            : undefined,
        productName: formData.productName.trim(),
        productVariant: formData.productVariant.trim() || undefined,
        lotCode,
        inventoryUnit: formData.inventoryUnit.trim() || "kg",
        grade: formData.grade,
        note: noteWithMetadata,
      },
    });
  }, [
    createMutation,
    editingBatch,
    effectiveSeasonId,
    formData,
    resolveSubmitSeasonId,
    seasonContext?.seasons,
    t,
    updateMutation,
    activePHI,
  ]);

  const handleDeleteBatch = useCallback(
    async (batch: HarvestBatch) => {
      const id = Number(batch.id);
      if (!Number.isFinite(id) || id <= 0) {
        toast.error(t("harvests.validation.invalidBatchId", "Invalid batch id"));
        return;
      }
      try {
        await deleteMutation.mutateAsync({
          id,
          seasonId: parseSeasonId(batch.seasonId ?? undefined),
        });
        toast.success(t("harvests.toast.batchDeleted", "Batch Deleted"));
        setSelectedBatchIds((previous) =>
          previous.filter((selectedId) => selectedId !== batch.id)
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("harvests.toast.unableToDeleteBatch", "Unable to delete batch.");
        toast.error(t("harvests.toast.deleteFailed", "Failed to delete"), { description: message });
      }
    },
    [deleteMutation, t]
  );

  const handleDeleteSelectedBatches = useCallback(
    async (selectedBatches: HarvestBatch[]) => {
      if (selectedBatches.length === 0) {
        toast.error(t("harvests.validation.noBatchesSelected", "No batches selected"));
        return;
      }

      const validTargets = selectedBatches
        .map((batch) => ({
          id: Number(batch.id),
          seasonId: parseSeasonId(batch.seasonId ?? undefined),
        }))
        .filter((target) => Number.isFinite(target.id) && target.id > 0);

      if (validTargets.length === 0) {
        toast.error(t("harvests.validation.noValidBatchIds", "No valid batch IDs found"));
        return;
      }

      const results = await Promise.allSettled(
        validTargets.map((target) =>
          deleteMutation.mutateAsync({
            id: target.id,
            seasonId: target.seasonId,
          })
        )
      );

      const successCount = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failedResults = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );

      if (successCount > 0) {
        toast.success(t("harvests.toast.batchesDeleted", "Batches Deleted"), {
          description: t("harvests.toast.batchesDeletedDescription", {
            count: successCount,
            defaultValue: `${successCount} batch(es) deleted.`,
          }),
        });
      }

      if (failedResults.length > 0) {
        const firstError = failedResults[0].reason;
        const message =
          firstError instanceof Error
            ? firstError.message
            : t("harvests.toast.someBatchesDeleteFailed", "Some batches could not be deleted.");
        toast.error(t("harvests.toast.partialDeleteFailure", "Partial delete failure"), {
          description: t("harvests.toast.partialDeleteFailureDescription", {
            count: failedResults.length,
            message,
            defaultValue: `${failedResults.length} failed. ${message}`,
          }),
        });
      }

      setSelectedBatchIds([]);
    },
    [deleteMutation, t]
  );

  const handleToggleBatchSelection = useCallback(
    (id: string, checked: boolean) => {
      setSelectedBatchIds((previous) => {
        if (checked) {
          return previous.includes(id) ? previous : [...previous, id];
        }
        return previous.filter((selectedId) => selectedId !== id);
      });
    },
    []
  );

  const handleToggleAllSelection = useCallback(
    (checked: boolean, visibleBatchIds?: string[]) => {
      if (!checked) {
        setSelectedBatchIds([]);
        return;
      }
      const targetIds =
        visibleBatchIds && visibleBatchIds.length > 0
          ? visibleBatchIds
          : filteredBatches.map((batch) => batch.id);
      setSelectedBatchIds(targetIds);
    },
    [filteredBatches]
  );

  const handleViewDetails = useCallback((batch: HarvestBatch) => {
    setSelectedBatch(batch);
    setIsDetailsDrawerOpen(true);
  }, []);

  const handleEditBatch = useCallback((batch: HarvestBatch) => {
    const { note, metadata } = splitNoteMetadata(batch.notes);
    setEditingBatch(batch);
    setSelectedBatch(batch);
    setFormData({
      ...INITIAL_FORM_DATA,
      batchId: batch.batchId,
      date: batch.date,
      quantity: String(batch.quantity),
      grade: batch.grade ?? "A",
      moisture: metadata.moisturePercent ?? "",
      season: batch.seasonId ? String(batch.seasonId) : "",
      plot: metadata.harvestPlotId ?? "",
      plotName: batch.plot ?? "",
      crop: batch.crop ?? "",
      productName: batch.crop ?? "",
      status: batch.status ?? "stored",
      notes: note,
      purity: metadata.purityPercent ?? "",
      foreignMatter: metadata.foreignMatterPercent ?? "",
      brokenGrains: metadata.brokenGrainsPercent ?? "",
      harvestLoss: metadata.harvestLossPercent ?? "",
      cropResidueHandling: (metadata.cropResidueHandling as CropResidueHandling | undefined) ?? "",
    });
    setIsDetailsDrawerOpen(false);
    setIsAddBatchOpen(true);
  }, []);

  const handleExport = useCallback(
    (rows: HarvestBatch[]) => {
      if (rows.length === 0) {
        toast.error(t("harvests.export.noData", "No data to export"));
        return;
      }
      if (typeof window === "undefined") {
        toast.error(
          t("harvests.export.unavailable", "Export is not available in this environment"),
        );
        return;
      }

      const headers = [
        t("harvests.export.columns.harvestId", "Harvest ID"),
        t("harvests.export.columns.batchId", "Batch ID"),
        t("harvests.export.columns.seasonId", "Season ID"),
        t("harvests.export.columns.seasonName", "Season Name"),
        t("harvests.export.columns.harvestDate", "Harvest Date"),
        t("harvests.export.columns.quantityKg", "Quantity (kg)"),
        t("harvests.export.columns.unitPrice", "Unit Price"),
        t("harvests.export.columns.revenue", "Revenue"),
        t("harvests.export.columns.grade", "Grade"),
        t("harvests.export.columns.notes", "Notes"),
        t("harvests.export.columns.createdAt", "Created At"),
      ];

      const bodyRows = rows.map((batch) =>
        [
          batch.id,
          batch.batchId,
          batch.seasonId ?? "",
          batch.seasonName ?? "",
          batch.date,
          batch.quantity,
          batch.unitPrice ?? "",
          batch.revenue ?? "",
          batch.grade ?? "",
          batch.notes ?? "",
          batch.createdAt ?? "",
        ]
          .map(escapeCsvCell)
          .join(",")
      );

      const csv = [headers.map(escapeCsvCell).join(","), ...bodyRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      const seasonToken = effectiveSeasonId
        ? `season-${effectiveSeasonId}`
        : "all-seasons";
      link.href = url;
      link.download = `harvest-${seasonToken}-${date}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(t("harvests.export.complete", "CSV Export Complete"), {
        description: t("harvests.export.completeDescription", {
          count: rows.length,
          defaultValue: `${rows.length} row(s) exported.`,
        }),
      });
    },
    [effectiveSeasonId, t]
  );

  const handlePrint = useCallback(
    (rows: HarvestBatch[]) => {
      if (rows.length === 0) {
        toast.error(t("harvests.print.noData", "No data to print"));
        return;
      }
      if (typeof window === "undefined") {
        toast.error(t("harvests.print.unavailable", "Print is not available in this environment"));
        return;
      }

      const printWindow = window.open("", "_blank", "width=1200,height=800");
      if (!printWindow) {
        toast.error(t("harvests.print.windowBlocked", "Print window blocked"), {
          description: t(
            "harvests.print.windowBlockedDescription",
            "Please allow pop-ups to print harvest summary.",
          ),
        });
        return;
      }

      const generatedAt = new Date().toLocaleString(locale);
      const title = effectiveSeasonId
        ? t("harvests.print.titleForSeason", {
            seasonId: effectiveSeasonId,
            defaultValue: `Harvest Summary - Season #${effectiveSeasonId}`,
          })
        : t("harvests.print.titleAllSeasons", "Harvest Summary - All Seasons");
      const notAvailable = t("common.notAvailable", "—");
      const rowsHtml = rows
        .map(
          (batch) => `
          <tr>
            <td>${escapeHtml(batch.id)}</td>
            <td>${escapeHtml(batch.batchId)}</td>
            <td>${escapeHtml(batch.seasonName ?? batch.seasonId ?? notAvailable)}</td>
            <td>${escapeHtml(batch.date)}</td>
            <td style="text-align:right;">${escapeHtml(batch.quantity)}</td>
            <td>${escapeHtml(batch.grade ?? notAvailable)}</td>
            <td style="text-align:right;">${escapeHtml(batch.revenue ?? notAvailable)}</td>
            <td>${escapeHtml(batch.notes ?? notAvailable)}</td>
          </tr>`
        )
        .join("");

      printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
      h1 { margin: 0 0 8px; font-size: 20px; }
      p { margin: 0 0 16px; color: #555; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
      th { background: #f3f4f6; text-align: left; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(t("harvests.print.generatedAt", {
      time: generatedAt,
      defaultValue: `Generated at ${generatedAt}`,
    }))}</p>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(t("harvests.export.columns.harvestId", "Harvest ID"))}</th>
          <th>${escapeHtml(t("harvests.export.columns.batchId", "Batch ID"))}</th>
          <th>${escapeHtml(t("harvests.export.columns.season", "Season"))}</th>
          <th>${escapeHtml(t("harvests.export.columns.harvestDate", "Harvest Date"))}</th>
          <th style="text-align:right;">${escapeHtml(t("harvests.export.columns.quantityKg", "Quantity (kg)"))}</th>
          <th>${escapeHtml(t("harvests.export.columns.grade", "Grade"))}</th>
          <th style="text-align:right;">${escapeHtml(t("harvests.export.columns.revenue", "Revenue"))}</th>
          <th>${escapeHtml(t("harvests.export.columns.notes", "Notes"))}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
</html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    },
    [effectiveSeasonId, locale, t]
  );

  return {
    effectiveSeasonId,
    hasSeasonContext: !!seasonContext,
    selectedSeason,
    setSelectedSeason,
    isAddBatchOpen,
    setIsAddBatchOpen,
    selectedBatch,
    setSelectedBatch,
    editingBatch,
    isDetailsDrawerOpen,
    setIsDetailsDrawerOpen,
    batches,
    formData,
    setFormData,
    isLoading: apiLoading,
    error: apiError ?? null,
    refetch,
    filteredBatches,
    totalHarvested,
    lotsCount,
    avgGrade,
    avgMoisture,
    yieldVsPlan,
    dailyTrend,
    gradeDistribution,
    summaryStats,
    selectedBatchIds,
    setSelectedBatchIds,
    getStatusBadge,
    getGradeBadge,
    handleAddBatch,
    handleDeleteBatch,
    handleDeleteSelectedBatches,
    handleToggleBatchSelection,
    handleToggleAllSelection,
    resetForm,
    handleViewDetails,
    handleEditBatch,
    handleExport,
    handlePrint,
    isCreating: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
