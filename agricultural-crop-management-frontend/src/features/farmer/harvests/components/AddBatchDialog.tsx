import { AlertTriangle, ClipboardCheck, Edit, Loader2, Plus, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { BackButton } from "@/shared/ui/back-button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";
import { Badge } from "@/shared/ui/badge";
import type { CropResidueHandling, HarvestFormData, HarvestGrade, QualityGrade, SubStandardDisposition, PackagingType, ProcessingType } from "../types";
import { GRADE_OPTIONS, QUALITY_GRADE_OPTIONS, SUBSTANDARD_DISPOSITION_OPTIONS, PACKAGING_TYPE_OPTIONS, PROCESSING_TYPE_OPTIONS } from "../constants";
import { useSeasons } from "@/entities/season";
import { useMyWarehouses, useLocations } from "@/entities/inventory";
import { useHarvestStockContext } from "@/entities/harvest";
import { useProductWarehouseLots } from "@/entities/product-warehouse";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useEffect, useMemo, useRef, useState } from "react";
import "./AddBatchDialog.css";

interface AddBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  formData: HarvestFormData;
  onFormChange: (data: HarvestFormData) => void;
  onSubmit: () => void;
  seasonId?: number;
  isSeasonLocked?: boolean;
  lockedSeasonLabel?: string;
  isWriteLocked?: boolean;
  warehouseCount?: number;
  writeLockReason?: string;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const LEGUME_ROTATION_KEYWORDS = [
  "bean",
  "soy",
  "pea",
  "peanut",
  "clover",
  "legume",
  "dau",
  "lac",
] as const;

const toAlphaNumericToken = (value: string, fallback: string): string => {
  const token = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return token || fallback;
};

const resolveDateToken = (dateValue: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
    return dateValue.replace(/-/g, "");
  }
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
};

const buildBatchPreview = (dateValue: string): string =>
  `HRV-${resolveDateToken(dateValue)}-001`;

const buildLotSuggestion = (
  seasonValue: string,
  cropValue: string,
  dateValue: string,
): string => {
  const seasonToken = toAlphaNumericToken(seasonValue, "GEN");
  const cropToken = toAlphaNumericToken(cropValue, "CROP");
  const dateToken = resolveDateToken(dateValue);
  return `LOT-${seasonToken}-${cropToken}-${dateToken}`;
};

const isLegumeCropName = (cropName?: string | null): boolean => {
  if (!cropName) return false;
  const normalized = cropName.toLowerCase();
  return LEGUME_ROTATION_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const toSafeTime = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function AddBatchDialog({
  open,
  onOpenChange,
  mode = "create",
  formData,
  onFormChange,
  onSubmit,
  seasonId,
  isSeasonLocked = false,
  lockedSeasonLabel,
  isWriteLocked = false,
  warehouseCount = 0,
  writeLockReason,
  onCancel,
  isSubmitting = false,
}: AddBatchDialogProps) {
  const { t } = useI18n();
  const [advancedSectionValue, setAdvancedSectionValue] = useState<string>("");
  const initialFormRef = useRef<string | null>(null);
  const isEditing = mode === "edit";

  const { data: seasonsData } = useSeasons({ page: 0, size: 200 });
  const { data: warehousesData } = useMyWarehouses("OUTPUT");

  const selectedWarehouseId = Number(formData.warehouseId);
  const hasWarehouse = Number.isFinite(selectedWarehouseId) && selectedWarehouseId > 0;

  const selectedSeasonIdFromForm = Number(formData.season);
  const selectedSeasonId = seasonId
    ?? (Number.isFinite(selectedSeasonIdFromForm) && selectedSeasonIdFromForm > 0
      ? selectedSeasonIdFromForm
      : undefined);

  const selectedSeason = useMemo(
    () =>
      seasonsData?.items?.find((season) => season.id === selectedSeasonId) ?? null,
    [seasonsData?.items, selectedSeasonId],
  );

  useEffect(() => {
    if (!open) {
      setAdvancedSectionValue("");
      initialFormRef.current = null;
      return;
    }

    if (!selectedSeason) {
      if (!initialFormRef.current) {
        initialFormRef.current = JSON.stringify(formData);
      }
      return;
    }

    const nextPlot = selectedSeason.plotId && selectedSeason.plotId > 0
      ? String(selectedSeason.plotId)
      : "";
    const nextPlotName = selectedSeason.plotName ?? "";
    const nextCrop = selectedSeason.cropName ?? "";

    let hasChanges = false;
    const nextData: HarvestFormData = { ...formData };

    if (nextData.plot !== nextPlot) {
      nextData.plot = nextPlot;
      hasChanges = true;
    }
    if (nextData.plotName !== nextPlotName) {
      nextData.plotName = nextPlotName;
      hasChanges = true;
    }
    if (nextData.crop !== nextCrop) {
      nextData.crop = nextCrop;
      hasChanges = true;
    }

    if (hasChanges) {
      const currentSerialized = JSON.stringify(formData);
      if (!initialFormRef.current || initialFormRef.current === currentSerialized) {
        initialFormRef.current = JSON.stringify(nextData);
      }
      onFormChange(nextData);
      return;
    }

    if (!initialFormRef.current) {
      initialFormRef.current = JSON.stringify(formData);
    }
  }, [formData, onFormChange, open, selectedSeason]);

  const hasValidSeason = !!selectedSeasonId && selectedSeasonId > 0;

  const selectedPlotIdFromForm = Number(formData.plot);
  const selectedPlotId = Number.isFinite(selectedPlotIdFromForm) && selectedPlotIdFromForm > 0
    ? selectedPlotIdFromForm
    : selectedSeason?.plotId;
  const hasPlotLink = !!selectedPlotId && selectedPlotId > 0;
  const resolvedPlotName = formData.plotName.trim() || selectedSeason?.plotName || "";

  const { data: locationsData } = useLocations(hasWarehouse ? selectedWarehouseId : undefined);
  const { data: lotsData } = useProductWarehouseLots({
    page: 0,
    size: 200,
    ...(hasWarehouse ? { warehouseId: selectedWarehouseId } : {}),
  });

  const seasonOptions = useMemo(
    () =>
      seasonsData?.items?.map((season) => ({
        value: String(season.id),
        label: season.seasonName,
      })) ?? [],
    [seasonsData],
  );

  const warehouseOptions = useMemo(
    () =>
      (warehousesData ?? []).map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name,
      })),
    [warehousesData],
  );

  const hasOutputWarehouse = warehouseCount > 0 || warehouseOptions.length > 0;
  const isFormDisabled = isWriteLocked || isSubmitting;

  const locationOptions = useMemo(
    () =>
      (locationsData ?? []).map((location) => ({
        value: String(location.id),
        label: location.label ?? t("harvests.addBatch.locationFallback", {
          id: location.id,
        }),
      })),
    [locationsData, t],
  );

  const productOptions = useMemo(() => {
    const map = new Map<
      string,
      { productName: string; productId?: number | null; productVariant?: string | null }
    >();
    (lotsData?.items ?? []).forEach((lot) => {
      if (!lot.productName) return;
      if (!map.has(lot.productName)) {
        map.set(lot.productName, {
          productName: lot.productName,
          productId: lot.productId,
          productVariant: lot.productVariant,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [lotsData]);

  const productMapByName = useMemo(
    () => new Map(productOptions.map((option) => [option.productName, option])),
    [productOptions],
  );

  const lotCodeSuggestion = useMemo(
    () => buildLotSuggestion(
      selectedSeasonId ? String(selectedSeasonId) : "GEN",
      formData.productName || selectedSeason?.cropName || formData.crop || "CROP",
      formData.date,
    ),
    [formData.crop, formData.date, formData.productName, selectedSeason?.cropName, selectedSeasonId],
  );

  const lotCodeOptions = useMemo(() => {
    const lotSet = new Set<string>();
    if (lotCodeSuggestion) {
      lotSet.add(lotCodeSuggestion);
    }

    (lotsData?.items ?? []).forEach((lot) => {
      if (!lot.lotCode) return;
      if (formData.productName && lot.productName !== formData.productName) return;
      lotSet.add(lot.lotCode);
    });

    return Array.from(lotSet).sort((a, b) => a.localeCompare(b));
  }, [formData.productName, lotCodeSuggestion, lotsData]);

  const contextSeasonId = selectedSeasonId;
  const stockContextQuery = useHarvestStockContext(contextSeasonId, {
    warehouseId: hasWarehouse ? selectedWarehouseId : undefined,
    productName: formData.productName.trim() || undefined,
    lotCode: formData.lotCode.trim() || undefined,
  });

  const hasRequiredQuickEntry =
    !!formData.date
    && Number(formData.quantity) > 0
    && (isEditing || (!!formData.productName.trim() && !!formData.warehouseId));
  const canSubmit =
    !isFormDisabled
    && (isEditing || (hasOutputWarehouse && hasValidSeason && hasPlotLink))
    && hasRequiredQuickEntry;

  const previousLegumeSeason = useMemo(() => {
    if (!selectedSeason?.plotId || !selectedSeason?.startDate) {
      return null;
    }

    const currentStartTime = toSafeTime(selectedSeason.startDate);
    if (!currentStartTime) {
      return null;
    }

    const candidate = (seasonsData?.items ?? [])
      .filter((item) => item.id !== selectedSeason.id && item.plotId === selectedSeason.plotId)
      .map((item) => ({ season: item, startTime: toSafeTime(item.startDate) }))
      .filter((item): item is { season: NonNullable<typeof selectedSeason>; startTime: number } =>
        item.startTime !== null && item.startTime < currentStartTime,
      )
      .sort((left, right) => right.startTime - left.startTime)[0];

    if (!candidate?.season?.cropName) {
      return null;
    }

    return isLegumeCropName(candidate.season.cropName) ? candidate.season : null;
  }, [seasonsData?.items, selectedSeason]);

  const cropResidueOptions = useMemo(
    () => [
      {
        value: "RETURNED_TO_SOIL",
        label: t("harvests.addBatch.cropResidue.returnedToSoil", "Returned to soil"),
      },
      {
        value: "REMOVED_FROM_FIELD",
        label: t("harvests.addBatch.cropResidue.removedFromField", "Removed from field"),
      },
      {
        value: "BURNED",
        label: t("harvests.addBatch.cropResidue.burned", "Burned"),
      },
      {
        value: "USED_AS_FEED_OR_COMPOST",
        label: t("harvests.addBatch.cropResidue.usedAsFeedOrCompost", "Used as feed/compost"),
      },
      {
        value: "UNKNOWN",
        label: t("harvests.addBatch.cropResidue.unknown", "Unknown"),
      },
    ],
    [t],
  );
  const gradeLabels: Record<HarvestGrade, string> = useMemo(
    () => ({
      Premium: t("harvests.grades.premium", "Premium"),
      A: t("harvests.grades.a", "Grade A"),
      B: t("harvests.grades.b", "Grade B"),
      C: t("harvests.grades.c", "Grade C"),
    }),
    [t],
  );

  const batchIdPreview = formData.batchId.trim() || buildBatchPreview(formData.date);
  const isDirty = open && !!initialFormRef.current && initialFormRef.current !== JSON.stringify(formData);
  const closeWithConfirm = () => {
    if (isSubmitting) return;
    if (
      isDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }
    onCancel();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSubmitting) return;
        if (!nextOpen) {
          closeWithConfirm();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent
        className="harvest-batch-dialog sm:max-w-[860px]"
        closeDisabled={isSubmitting}
      >
        <DialogHeader>
          <BackButton onClick={closeWithConfirm} className="w-fit" />
          <DialogTitle className="flex items-center gap-2 text-foreground text-xl">
            {isEditing ? (
              <Edit className="w-5 h-5 text-primary" />
            ) : (
              <Plus className="w-5 h-5 text-primary" />
            )}
            {isEditing
              ? t("harvests.addBatch.editTitle", "Edit Harvest Batch")
              : t("harvests.addBatch.title", "Add Harvest Batch")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditing
              ? t(
                  "harvests.addBatch.editDescription",
                  "Update harvest date, quantity, grade, notes, and quality metadata.",
                )
              : t(
                  "harvests.addBatch.description",
                  "Quickly record harvest output and keep inventory links in sync.",
                )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {isWriteLocked && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {writeLockReason || t("harvests.addBatch.alerts.seasonLocked", "This season is locked. Harvest write actions are disabled.")}
            </div>
          )}
          {!isEditing && !hasOutputWarehouse && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {t(
                "harvests.addBatch.alerts.noOutputWarehouse",
                "No output warehouse found. Create one before recording harvest.",
              )}
            </div>
          )}
          {!isEditing && !hasValidSeason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {t(
                "harvests.addBatch.alerts.invalidSeason",
                "Select a valid season before saving a harvest batch.",
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-muted/15 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {t("harvests.addBatch.quickEntryTitle", "Quick Entry")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "harvests.addBatch.quickEntryDescription",
                  "Record essential harvest details first. Open advanced settings only when needed.",
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="harvest-form-field">
                <Label htmlFor="date" className="text-foreground">
                  {t("harvests.addBatch.fields.harvestDate", "Harvest Date")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(event) => onFormChange({ ...formData, date: event.target.value })}
                  className="rounded-xl border-border focus:border-primary"
                  disabled={isFormDisabled}
                />
              </div>

              <div className="harvest-form-field">
                <Label htmlFor="season" className="text-foreground">
                  {t("harvests.addBatch.fields.season", "Season")}
                </Label>
                {isSeasonLocked || isEditing ? (
                  <div className="harvest-readonly-field rounded-xl border border-border px-3 py-2 text-sm bg-muted/30">
                    {lockedSeasonLabel || selectedSeason?.seasonName || t("harvests.addBatch.currentSeason", "Current season")}
                  </div>
                ) : (
                  <Select
                    value={formData.season}
                    onValueChange={(value: string) =>
                      onFormChange({ ...formData, season: value })
                    }
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger className="rounded-xl border-border">
                      <SelectValue placeholder={t("harvests.addBatch.placeholders.selectSeason", "Select season")} />
                    </SelectTrigger>
                    <SelectContent>
                      {seasonOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="harvest-form-field">
                <Label className="text-foreground">
                  {t("harvests.addBatch.fields.harvestFromPlot", "Harvest From Plot")} <span className="text-destructive">*</span>
                </Label>
                <div className={`harvest-readonly-field rounded-xl border px-3 py-2 text-sm ${
                  hasPlotLink
                    ? "border-border bg-muted/30 text-foreground"
                    : "border-destructive/40 bg-destructive/5 text-destructive"
                }`}>
                  {hasPlotLink
                    ? resolvedPlotName || t("harvests.addBatch.placeholders.plotLinked", "Plot linked from season")
                    : t("harvests.addBatch.plotMissing", "This season is missing a valid plot link.")}
                </div>
              </div>
            </div>

            {previousLegumeSeason && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white border-emerald-700">
                    {t("harvests.addBatch.legumeBadge.title", "Previous legume rotation detected")}
                  </Badge>
                  <span>
                    {t(
                      "harvests.addBatch.legumeBadge.subtitle",
                      "Potential soil nitrogen carry-over improved.",
                    )}
                  </span>
                </div>
              </div>
            )}

            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
                isEditing ? "" : "xl:grid-cols-3"
              }`}
            >
              {!isEditing && (
              <div className="harvest-form-field">
                <Label htmlFor="productName" className="text-foreground">
                  {t("harvests.addBatch.fields.cropProduct", "Crop / Product")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="productName"
                  list="harvest-product-name-options"
                  placeholder={t("harvests.addBatch.placeholders.enterProduct", "Enter product name")}
                  value={formData.productName}
                  onChange={(event) => {
                    const value = event.target.value;
                    const matched = productMapByName.get(value);
                    onFormChange({
                      ...formData,
                      productName: value,
                      productId:
                        matched?.productId && Number.isFinite(matched.productId)
                          ? String(matched.productId)
                          : "",
                      productVariant:
                        matched?.productVariant && !formData.productVariant
                          ? matched.productVariant
                          : formData.productVariant,
                    });
                  }}
                  className="rounded-xl border-border focus:border-primary"
                  disabled={isFormDisabled}
                />
                <datalist id="harvest-product-name-options">
                  {productOptions.map((option) => (
                    <option key={option.productName} value={option.productName} />
                  ))}
                </datalist>
              </div>
              )}

              <div className="harvest-form-field">
                <Label htmlFor="quantity" className="text-foreground">
                  {t("harvests.addBatch.fields.quantityKg", "Quantity (kg)")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(event) => onFormChange({ ...formData, quantity: event.target.value })}
                  className="rounded-xl border-border focus:border-primary"
                  disabled={isFormDisabled}
                />
              </div>

              <div className="harvest-form-field">
                <Label htmlFor="grade" className="text-foreground">
                  {t("harvests.addBatch.fields.grade", "Grade")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value: HarvestGrade) =>
                    onFormChange({ ...formData, grade: value })
                  }
                  disabled={isFormDisabled}
                >
                  <SelectTrigger id="grade" className="rounded-xl border-border">
                    <SelectValue placeholder={t("harvests.addBatch.placeholders.selectGrade", "Select grade")} />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {gradeLabels[option.value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="harvest-form-field">
                <Label htmlFor="grossWetWeight" className="text-foreground">
                  Khối lượng ướt gặt ngoài đồng (kg)
                </Label>
                <Input
                  id="grossWetWeight"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={formData.grossWetWeight || ""}
                  onChange={(event) => onFormChange({ ...formData, grossWetWeight: event.target.value })}
                  className="rounded-xl border-border focus:border-primary bg-blue-50/30"
                  disabled={isFormDisabled}
                />
              </div>

              {!isEditing && (
              <div className="harvest-form-field">
                <Label htmlFor="warehouse" className="text-foreground">
                  {t("harvests.addBatch.fields.warehouse", "Warehouse")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.warehouseId}
                  onValueChange={(value: string) =>
                    onFormChange({ ...formData, warehouseId: value, locationId: "" })
                  }
                  disabled={isFormDisabled || !hasOutputWarehouse}
                >
                  <SelectTrigger className="rounded-xl border-border">
                    <SelectValue placeholder={t("harvests.addBatch.placeholders.selectWarehouse", "Select warehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}

              <div className="harvest-form-field">
                <Label htmlFor="qualityGrade" className="text-foreground">
                  {t("harvests.addBatch.fields.qualityGrade", "Quality Grade")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.qualityGrade}
                  onValueChange={(value: QualityGrade) => onFormChange({ ...formData, qualityGrade: value, subStandardQuantity: "", subStandardDisposition: "" })}
                  disabled={isFormDisabled}
                >
                  <SelectTrigger className="rounded-xl border-border">
                    <SelectValue placeholder="Chọn chất lượng" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_GRADE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.qualityGrade === "SUBSTANDARD" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-4 border border-destructive/20 rounded-xl bg-destructive/5">
                <div className="space-y-2">
                  <Label htmlFor="subStandardQuantity" className="text-foreground">
                    Khối lượng không đạt (kg) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="subStandardQuantity"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="VD: 500"
                    value={formData.subStandardQuantity || ""}
                    onChange={(event) => onFormChange({ ...formData, subStandardQuantity: event.target.value })}
                    className="rounded-xl border-border focus:border-destructive"
                    disabled={isFormDisabled}
                  />
                  <p className="text-xs text-muted-foreground">Sẽ được trừ vào khối lượng đạt chuẩn</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subStandardDisposition" className="text-foreground">
                    Hướng xử lý phụ phẩm <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.subStandardDisposition}
                    onValueChange={(value: SubStandardDisposition) => onFormChange({ ...formData, subStandardDisposition: value })}
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger className="rounded-xl border-border">
                      <SelectValue placeholder="Chọn hướng xử lý" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSTANDARD_DISPOSITION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="harvest-form-field">
              <Label htmlFor="qualityNotes" className="text-foreground">
                {t("harvests.addBatch.fields.qualityNotes", "Quality notes")}
              </Label>
              <Input
                id="qualityNotes"
                placeholder={t(
                  "harvests.addBatch.placeholders.qualityNotes",
                  "Describe appearance, moisture, defects, or inspection results",
                )}
                value={formData.qualityNotes || ""}
                onChange={(event) =>
                  onFormChange({ ...formData, qualityNotes: event.target.value })
                }
                className="rounded-xl border-border focus:border-primary"
                disabled={isFormDisabled}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground">
                  {t("harvests.addBatch.fields.notes", "Notes")}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={t("harvests.addBatch.placeholders.notes", "Add any additional notes...")}
                  value={formData.notes}
                  onChange={(event) => onFormChange({ ...formData, notes: event.target.value })}
                  className="rounded-xl border-border focus:border-primary min-h-[92px]"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 p-4 border border-primary/20 rounded-xl bg-primary/5">
                  <div className="col-span-1 md:col-span-3">
                    <h4 className="text-sm font-semibold text-primary">
                      {t("harvests.addBatch.fields.packagingProcessing", "Packaging & processing")}
                    </h4>
                  </div>
                  <div className="harvest-form-field">
                    <Label htmlFor="packagingType" className="text-foreground">Loại đóng gói</Label>
                    <Select
                      value={formData.packagingType || ""}
                      onValueChange={(value: PackagingType) => onFormChange({ ...formData, packagingType: value })}
                      disabled={isFormDisabled}
                    >
                      <SelectTrigger className="rounded-xl border-border">
                        <SelectValue placeholder="Không đóng gói" />
                      </SelectTrigger>
                      <SelectContent>
                        {PACKAGING_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="harvest-form-field">
                    <Label htmlFor="packagingCount" className="text-foreground">Số lượng kiện</Label>
                    <Input
                      id="packagingCount"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="VD: 50"
                      value={formData.packagingCount || ""}
                      onChange={(event) => onFormChange({ ...formData, packagingCount: event.target.value })}
                      className="rounded-xl border-border focus:border-primary"
                      disabled={isFormDisabled || !formData.packagingType || formData.packagingType === "NONE"}
                    />
                  </div>
                  <div className="harvest-form-field">
                    <Label htmlFor="processingType" className="text-foreground">Quy trình sơ chế</Label>
                    <Select
                      value={formData.processingType || ""}
                      onValueChange={(value: ProcessingType) => onFormChange({ ...formData, processingType: value })}
                      disabled={isFormDisabled}
                    >
                      <SelectTrigger className="rounded-xl border-border">
                        <SelectValue placeholder="Chưa sơ chế" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROCESSING_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
            </div>
          </div>

          <Accordion
            type="single"
            collapsible
            value={advancedSectionValue}
            onValueChange={setAdvancedSectionValue}
            className="w-full"
          >
            <AccordionItem value="advanced" className="rounded-2xl border border-border px-4 bg-card">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {t("harvests.addBatch.fields.advancedInventoryQuality", "Advanced Inventory & Quality")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(
                      "harvests.addBatch.advancedDescription",
                      "Lot controls, quality metrics, and optional sustainability attributes.",
                    )}
                  </p>
                </div>
              </AccordionTrigger>

              <AccordionContent className="space-y-4">
                {!isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="harvest-form-field">
                    <Label htmlFor="batchIdPreview" className="text-foreground">
                      {t("harvests.addBatch.fields.batchIdPreview", "Batch ID Preview")}
                    </Label>
                    <Input
                      id="batchIdPreview"
                      value={batchIdPreview}
                      readOnly
                      className="rounded-xl border-border bg-muted/30"
                    />
                  </div>

                  <div className="harvest-form-field">
                    <Label htmlFor="lotCode" className="text-foreground">
                      {t("harvests.addBatch.fields.lotNumber", "Lot Number")}
                    </Label>
                    <Input
                      id="lotCode"
                      list="harvest-lot-options"
                      placeholder={lotCodeSuggestion}
                      value={formData.lotCode}
                      onChange={(event) => onFormChange({ ...formData, lotCode: event.target.value })}
                      className="rounded-xl border-border focus:border-primary"
                      disabled={isFormDisabled}
                    />
                    <datalist id="harvest-lot-options">
                      {lotCodeOptions.map((lotCode) => (
                        <option key={lotCode} value={lotCode} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "harvests.addBatch.lotHint",
                        "If left blank, lot number will be auto-generated when saving.",
                      )}
                    </p>
                  </div>

                  <div className="harvest-form-field">
                    <Label htmlFor="productVariant" className="text-foreground">
                      {t("harvests.addBatch.fields.productVariant", "Product Variant")}
                    </Label>
                    <Input
                      id="productVariant"
                      placeholder={t("harvests.addBatch.placeholders.optional", "Optional")}
                      value={formData.productVariant}
                      onChange={(event) => onFormChange({ ...formData, productVariant: event.target.value })}
                      className="rounded-xl border-border focus:border-primary"
                      disabled={isFormDisabled}
                    />
                  </div>
                </div>
                )}

                {!isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="harvest-form-field">
                    <Label htmlFor="location" className="text-foreground">
                      {t("harvests.addBatch.fields.locationOptional", "Location (Optional)")}
                    </Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={(value: string) => onFormChange({ ...formData, locationId: value })}
                      disabled={isFormDisabled || !hasWarehouse}
                    >
                      <SelectTrigger className="rounded-xl border-border">
                        <SelectValue placeholder={t("harvests.addBatch.placeholders.selectLocation", "Select location")} />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="harvest-form-field">
                    <Label htmlFor="inventoryUnit" className="text-foreground">
                      {t("harvests.addBatch.fields.inventoryUnit", "Inventory Unit")}
                    </Label>
                    <Input
                      id="inventoryUnit"
                      value="kg"
                      readOnly
                      className="rounded-xl border-border bg-muted/30"
                    />
                  </div>

                  <div className="harvest-form-field">
                    <Label htmlFor="productId" className="text-foreground">
                      {t("harvests.addBatch.fields.productIdReadonly", "Product ID (Readonly)")}
                    </Label>
                    <Input
                      id="productId"
                      type="number"
                      value={formData.productId}
                      readOnly
                      className="rounded-xl border-border bg-muted/30"
                    />
                  </div>
                </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="harvest-form-field">
                    <Label htmlFor="moisture" className="text-foreground">
                      {t("harvests.addBatch.fields.moisture", "Moisture %")}
                    </Label>
                    <Input
                      id="moisture"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder={t("harvests.addBatch.placeholders.optionalPercent", "Optional")}
                      value={formData.moisture}
                      onChange={(event) => onFormChange({ ...formData, moisture: event.target.value })}
                      className="rounded-xl border-border focus:border-primary"
                      disabled={isFormDisabled}
                    />
                  </div>

                  <div className="harvest-form-field">
                    <Label htmlFor="harvestLoss" className="text-foreground">
                      {t("harvests.addBatch.fields.harvestLoss", "Harvest Loss %")}
                    </Label>
                    <Input
                      id="harvestLoss"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder={t("harvests.addBatch.placeholders.optionalPercent", "Optional")}
                      value={formData.harvestLoss}
                      onChange={(event) => onFormChange({ ...formData, harvestLoss: event.target.value })}
                      className="rounded-xl border-border focus:border-primary"
                      disabled={isFormDisabled}
                    />
                  </div>

                  <div className="harvest-form-field">
                    <Label htmlFor="cropResidueHandling" className="text-foreground">
                      {t("harvests.addBatch.fields.cropResidueHandling", "Crop Residue Handling")}
                    </Label>
                    <Select
                      value={formData.cropResidueHandling}
                      onValueChange={(value: CropResidueHandling) =>
                        onFormChange({ ...formData, cropResidueHandling: value })
                      }
                      disabled={isFormDisabled}
                    >
                      <SelectTrigger id="cropResidueHandling" className="rounded-xl border-border">
                        <SelectValue placeholder={t("harvests.addBatch.placeholders.optional", "Optional")} />
                      </SelectTrigger>
                      <SelectContent>
                        {cropResidueOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div>
                  <h4 className="text-sm text-foreground mb-3 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-primary" />
                    {t("harvests.addBatch.fields.qualityControlMetrics", "Quality Control Metrics (Optional)")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="harvest-form-field">
                      <Label htmlFor="purity" className="text-foreground">
                        {t("harvests.addBatch.fields.purity", "Purity %")}
                      </Label>
                      <Input
                        id="purity"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder={t("harvests.addBatch.placeholders.optionalPercent", "Optional")}
                        value={formData.purity}
                        onChange={(event) => onFormChange({ ...formData, purity: event.target.value })}
                        className="rounded-xl border-border focus:border-primary"
                        disabled={isFormDisabled}
                      />
                    </div>

                    <div className="harvest-form-field">
                      <Label htmlFor="foreignMatter" className="text-foreground">
                        {t("harvests.addBatch.fields.foreignMatter", "Foreign Matter %")}
                      </Label>
                      <Input
                        id="foreignMatter"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder={t("harvests.addBatch.placeholders.optionalPercent", "Optional")}
                        value={formData.foreignMatter}
                        onChange={(event) => onFormChange({ ...formData, foreignMatter: event.target.value })}
                        className="rounded-xl border-border focus:border-primary"
                        disabled={isFormDisabled}
                      />
                    </div>

                    <div className="harvest-form-field">
                      <Label htmlFor="brokenGrains" className="text-foreground">
                        {t("harvests.addBatch.fields.brokenGrains", "Broken Grains %")}
                      </Label>
                      <Input
                        id="brokenGrains"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder={t("harvests.addBatch.placeholders.optionalPercent", "Optional")}
                        value={formData.brokenGrains}
                        onChange={(event) => onFormChange({ ...formData, brokenGrains: event.target.value })}
                        className="rounded-xl border-border focus:border-primary"
                        disabled={isFormDisabled}
                      />
                    </div>
                  </div>
                </div>

                {!isEditing && (
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {t("harvests.addBatch.fields.currentLotStockContext", "Current lot stock context")}
                  </p>
                  {!contextSeasonId || !hasWarehouse || !formData.productName || !formData.lotCode ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(
                        "harvests.addBatch.stockContextHint",
                        "Select warehouse, product, and lot to preview current stock context.",
                      )}
                    </p>
                  ) : stockContextQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("harvests.addBatch.loadingStockContext", "Loading stock context...")}
                    </p>
                  ) : stockContextQuery.data ? (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md border border-border bg-card px-3 py-2">
                        {t("harvests.addBatch.fields.warehouse", "Warehouse")}:{" "}
                        <span className="font-medium">{stockContextQuery.data.warehouseName || "-"}</span>
                      </div>
                      <div className="rounded-md border border-border bg-card px-3 py-2">
                        {t("harvests.addBatch.matchingLots", "Matching lots")}:{" "}
                        <span className="font-medium">{stockContextQuery.data.matchingLots}</span>
                      </div>
                      <div className="rounded-md border border-border bg-card px-3 py-2">
                        {t("harvests.addBatch.onHand", "On-hand")}:{" "}
                        <span className="font-medium">
                          {stockContextQuery.data.onHandQuantity} {stockContextQuery.data.unit || ""}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("harvests.addBatch.noStockContext", "No stock context found.")}
                    </p>
                  )}
                </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {!isEditing && !hasPlotLink && hasValidSeason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>
                {t(
                  "harvests.addBatch.plotRequiredForSustainability",
                  "Harvest must be linked to a valid plot to keep NUE/FDN analytics reliable.",
                )}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeWithConfirm}
            disabled={isSubmitting}
            disabledHint={t("harvests.addBatch.savingHint", "Harvest batch is being saved")}
          >
            <X className="w-4 h-4 mr-2" />
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            disabledHint={isSubmitting ? t("harvests.addBatch.savingHint", "Harvest batch is being saved") : undefined}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSubmitting
              ? t("harvests.addBatch.saving", "Saving...")
              : isEditing
                ? t("harvests.addBatch.updateButton", "Update Batch")
                : t("harvests.addBatch.saveButton", "Save Batch")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
