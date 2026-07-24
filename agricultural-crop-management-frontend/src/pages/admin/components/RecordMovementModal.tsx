import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  adminSeasonApi,
  adminSupplierApi,
  adminWarehouseApi,
} from "@/entities/user/api/api.admin";
import { BackButton } from "@/shared/ui/back-button";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Package,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

interface WarehouseItem {
  id: number;
  name: string;
  type: string;
  farmId: number;
  farmName: string;
}

interface StockLocation {
  id: number;
  zone: string | null;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  warehouseId: number;
}

interface SupplyLot {
  id: number;
  batchCode: string;
  supplyItemName: string;
  supplierName: string;
}

interface Season {
  id: number;
  seasonName: string;
  farmName: string;
  plotName: string;
}

interface RecordMovementModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  warehouses: WarehouseItem[];
}

// ═══════════════════════════════════════════════════════════════
// ERROR MESSAGE MAPPING
// ═══════════════════════════════════════════════════════════════

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  INSUFFICIENT_STOCK: "admin.recordMovement.errors.insufficientStock",
  WAREHOUSE_SEASON_FARM_MISMATCH: "admin.recordMovement.errors.warehouseSeasonMismatch",
  LOCATION_WAREHOUSE_MISMATCH: "admin.recordMovement.errors.locationWarehouseMismatch",
  SUPPLY_LOT_NOT_FOUND: "admin.recordMovement.errors.supplyLotNotFound",
  WAREHOUSE_NOT_FOUND: "admin.recordMovement.errors.warehouseNotFound",
  LOCATION_NOT_FOUND: "admin.recordMovement.errors.locationNotFound",
  SEASON_NOT_FOUND: "admin.recordMovement.errors.seasonNotFound",
  INVALID_MOVEMENT_TYPE: "admin.recordMovement.errors.invalidMovementType",
  BAD_REQUEST: "admin.recordMovement.errors.badRequest",
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function RecordMovementModal({
  open,
  onClose,
  onSuccess,
  warehouses,
}: RecordMovementModalProps) {
  const { t } = useI18n();
  // Form state
  const [supplyLotId, setSupplyLotId] = useState<number | "">("");
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">(
    "IN",
  );
  const [quantity, setQuantity] = useState("");
  const [isNegativeAdjust, setIsNegativeAdjust] = useState(false);
  const [seasonId, setSeasonId] = useState<number | "">("");
  const [note, setNote] = useState("");

  // Data states
  const [supplyLots, setSupplyLots] = useState<SupplyLot[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [onHandQuantity, setOnHandQuantity] = useState<number | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirty =
    supplyLotId !== "" ||
    warehouseId !== "" ||
    locationId !== "" ||
    movementType !== "IN" ||
    quantity.trim().length > 0 ||
    isNegativeAdjust ||
    seasonId !== "" ||
    note.trim().length > 0;

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Load supply lots on open
  useEffect(() => {
    if (open) {
      fetchSupplyLots();
      fetchSeasons();
      resetForm();
    }
  }, [open]);

  // Load locations when warehouse changes
  useEffect(() => {
    if (warehouseId) {
      fetchLocations(warehouseId as number);
    } else {
      setLocations([]);
      setLocationId("");
    }
  }, [warehouseId]);

  // Check on-hand quantity for OUT/ADJUST
  useEffect(() => {
    if (
      (movementType === "OUT" || movementType === "ADJUST") &&
      supplyLotId &&
      warehouseId
    ) {
      checkOnHandQuantity();
    } else {
      setOnHandQuantity(null);
    }
  }, [supplyLotId, warehouseId, locationId, movementType]);

  // ═══════════════════════════════════════════════════════════════
  // FETCH FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  const fetchSupplyLots = async () => {
    setLotsLoading(true);
    try {
      const response = await adminSupplierApi.listLots({
        page: 0,
        size: 100,
        status: "ACTIVE",
      });
      if (response?.result?.items) {
        setSupplyLots(response.result.items);
      }
    } catch (err) {
      console.error("Failed to fetch supply lots:", err);
    } finally {
      setLotsLoading(false);
    }
  };

  const fetchLocations = async (whId: number) => {
    setLocationsLoading(true);
    try {
      const response = await adminWarehouseApi.getLocations(whId);
      if (response?.result) {
        setLocations(response.result);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  const fetchSeasons = async () => {
    setSeasonsLoading(true);
    try {
      const response = await adminSeasonApi.list({
        page: 0,
        size: 100,
        status: "ACTIVE",
      });
      if (response?.result?.items) {
        setSeasons(response.result.items);
      }
    } catch (err) {
      console.error("Failed to fetch seasons:", err);
    } finally {
      setSeasonsLoading(false);
    }
  };

  const checkOnHandQuantity = async () => {
    if (!supplyLotId || !warehouseId) return;

    setStockLoading(true);
    try {
      const qty = await adminWarehouseApi.getOnHandQuantity(
        supplyLotId as number,
        warehouseId as number,
        locationId ? (locationId as number) : undefined,
      );
      setOnHandQuantity(qty);
    } catch (err) {
      console.error("Failed to check on-hand quantity:", err);
      setOnHandQuantity(0);
    } finally {
      setStockLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FORM HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const resetForm = () => {
    setSupplyLotId("");
    setWarehouseId("");
    setLocationId("");
    setMovementType("IN");
    setQuantity("");
    setIsNegativeAdjust(false);
    setSeasonId("");
    setNote("");
    setError(null);
    setOnHandQuantity(null);
  };
  const handleClose = () => {
    if (
      isDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }

    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!supplyLotId) {
      setError(t("admin.recordMovement.validation.supplyLotRequired"));
      return;
    }
    if (!warehouseId) {
      setError(t("admin.recordMovement.validation.warehouseRequired"));
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError(t("admin.recordMovement.validation.quantityPositive"));
      return;
    }

    // Calculate final quantity
    let finalQuantity = parseFloat(quantity);
    if (movementType === "ADJUST" && isNegativeAdjust) {
      finalQuantity = -finalQuantity;
    }

    // Frontend validation for OUT/negative ADJUST
    if (onHandQuantity !== null) {
      if (movementType === "OUT" && finalQuantity > onHandQuantity) {
        setError(
          t("admin.recordMovement.validation.notEnoughRequested", {
            current: onHandQuantity,
            requested: finalQuantity,
          }),
        );
        return;
      }
      if (
        movementType === "ADJUST" &&
        isNegativeAdjust &&
        Math.abs(finalQuantity) > onHandQuantity
      ) {
        setError(
          t("admin.recordMovement.validation.notEnoughAdjustment", {
            current: onHandQuantity,
            adjustment: finalQuantity,
          }),
        );
        return;
      }
    }

    setLoading(true);

    try {
      await adminWarehouseApi.recordMovement({
        supplyLotId: supplyLotId as number,
        warehouseId: warehouseId as number,
        locationId: locationId ? (locationId as number) : undefined,
        movementType,
        quantity: finalQuantity,
        seasonId: seasonId ? (seasonId as number) : undefined,
        note: note || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      const code = err.response?.data?.code;
      const messageKey = ERROR_MESSAGE_KEYS[code];
      const message =
        (messageKey ? t(messageKey) : undefined) ||
        err.response?.data?.message ||
        t("admin.recordMovement.errors.recordFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Filter seasons by selected warehouse farm
  const getFilteredSeasons = () => {
    if (!warehouseId) return seasons;
    const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
    if (!selectedWarehouse) return seasons;
    // Filter seasons whose farm matches warehouse farm
    return seasons.filter((s: any) => {
      // If season has farmId or farmName that matches, filter by it
      // This is a simplified check - in real implementation, season would have farmId
      return true; // Show all seasons but validation happens on backend
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (!open) return null;

  const selectedLot = supplyLots.find((l) => l.id === supplyLotId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="space-y-2">
            <BackButton onClick={handleClose} className="w-fit" />
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("admin.recordMovement.title")}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Supply Lot */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.recordMovement.supplyLotRequired")}</label>
              <select
                value={supplyLotId}
                onChange={(e) =>
                  setSupplyLotId(e.target.value ? parseInt(e.target.value) : "")
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                disabled={lotsLoading}
              >
                <option value="">{t("admin.recordMovement.selectSupplyLot")}</option>
                {supplyLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.batchCode} - {lot.supplyItemName} ({lot.supplierName})
                  </option>
                ))}
              </select>
              {selectedLot && (
                <p className="text-xs text-muted-foreground">
                  {t("admin.recordMovement.selectedLotMeta", {
                    item: selectedLot.supplyItemName,
                    supplier: selectedLot.supplierName,
                  })}
                </p>
              )}
            </div>

            {/* Warehouse */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.recordMovement.warehouseRequired")}</label>
              <select
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(
                    e.target.value ? parseInt(e.target.value) : "",
                  );
                  setLocationId("");
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              >
                <option value="">{t("admin.recordMovement.selectWarehouse")}</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.farmName})
                  </option>
                ))}
              </select>
            </div>

            {/* Location (Optional) */}
            {warehouseId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t("admin.recordMovement.locationOptional")}
                </label>
                <select
                  value={locationId}
                  onChange={(e) =>
                    setLocationId(
                      e.target.value ? parseInt(e.target.value) : "",
                    )
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  disabled={locationsLoading}
                >
                  <option value="">{t("admin.recordMovement.noSpecificLocation")}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {[loc.zone, loc.aisle, loc.shelf, loc.bin]
                        .filter(Boolean)
                        .join(" / ") || t("admin.recordMovement.locationFallback", { id: loc.id })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Movement Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.recordMovement.movementTypeRequired")}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMovementType("IN");
                    setIsNegativeAdjust(false);
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                    movementType === "IN"
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  {t("admin.recordMovement.types.IN")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovementType("OUT");
                    setIsNegativeAdjust(false);
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                    movementType === "OUT"
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  {t("admin.recordMovement.types.OUT")}
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("ADJUST")}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                    movementType === "ADJUST"
                      ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t("admin.recordMovement.types.ADJUST")}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {movementType === "IN" &&
                  t("admin.recordMovement.typeDescriptions.IN")}
                {movementType === "OUT" &&
                  t("admin.recordMovement.typeDescriptions.OUT")}
                {movementType === "ADJUST" &&
                  t("admin.recordMovement.typeDescriptions.ADJUST")}
              </p>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.recordMovement.quantityRequired")}</label>
              <div className="flex gap-2">
                {movementType === "ADJUST" && (
                  <button
                    type="button"
                    onClick={() => setIsNegativeAdjust(!isNegativeAdjust)}
                    className={`px-4 py-2 rounded-lg border font-medium ${
                      isNegativeAdjust
                        ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {isNegativeAdjust ? "−" : "+"}
                  </button>
                )}
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  placeholder={t("admin.recordMovement.quantityPlaceholder")}
                />
              </div>
            </div>

            {/* Current Stock Display for OUT/ADJUST */}
            {(movementType === "OUT" || movementType === "ADJUST") &&
              supplyLotId &&
              warehouseId && (
                <div className="flex items-start gap-2 p-3 bg-muted/30 border border-border rounded-lg">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                  <div className="text-sm">
                    <strong>{t("admin.recordMovement.currentOnHand")}</strong>{" "}
                    {stockLoading ? (
                      <Loader2 className="inline h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-lg font-bold text-primary">
                        {onHandQuantity ?? 0}
                      </span>
                    )}
                    {locationId
                      ? t("admin.recordMovement.atSelectedLocation")
                      : t("admin.recordMovement.warehouseTotal")}
                  </div>
                </div>
              )}

            {/* Season (Optional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.recordMovement.seasonOptional")}</label>
              <select
                value={seasonId}
                onChange={(e) =>
                  setSeasonId(e.target.value ? parseInt(e.target.value) : "")
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                disabled={seasonsLoading}
              >
                <option value="">{t("admin.recordMovement.noSeasonLinked")}</option>
                {getFilteredSeasons().map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.seasonName} ({s.farmName || s.plotName || t("adminDashboardHooks.status.Unknown")})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("admin.recordMovement.seasonHelp")}
              </p>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.recordMovement.noteOptional")}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
                placeholder={t("admin.recordMovement.notePlaceholder")}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !supplyLotId || !warehouseId || !quantity}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? t("admin.recordMovement.recording") : t("admin.recordMovement.title")}
          </button>
        </div>
      </div>
    </div>
  );
}
