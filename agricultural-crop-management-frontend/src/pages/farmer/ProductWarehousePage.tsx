import {
  useAdjustProductWarehouseLot,
  useProductWarehouseLots,
  useProductWarehouseOverview,
  useProductWarehouseTraceability,
  useProductWarehouseTransactions,
  useStockOutProductWarehouseLot,
  type ProductWarehouseLot,
} from "@/entities/product-warehouse";
import {
  useCreateWarehouse,
  useDeleteWarehouse,
  useLocations,
  useMyWarehouses,
  useUpdateWarehouse,
  type Warehouse as WarehouseEntity,
} from "@/entities/inventory";
import { useFarms } from "@/entities/farm";
import { usePlotsByFarm } from "@/entities/plot";
import { useSeasons } from "@/entities/season";
import { useDebounce } from "@/shared/lib";
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/shared/ui";
import { Boxes, History, MapPin, PackageCheck, AlertCircle, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu/DropdownMenu";
import { SubStandardDisposalModal } from "./components/SubStandardDisposalModal";
import "./ProductWarehousePage.css";

type ProductWarehouseTab = "on-hand" | "transactions" | "traceability";
type WarehouseDialogMode = "create" | "edit";

const STATUS_OPTIONS = ["IN_STOCK", "HOLD", "DEPLETED", "ARCHIVED"] as const;
const parsePositiveInt = (raw: string | null): number | undefined => {
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const getLotStatusBadgeClassName = (status?: string | null): string => {
  switch (status) {
    case "IN_STOCK":
      return "acm-status-measured";
    case "HOLD":
    case "RESERVED":
    case "PENDING":
      return "acm-status-estimated";
    case "DEPLETED":
    case "ARCHIVED":
    case "EXPIRED":
      return "acm-status-missing";
    default:
      return "acm-badge-secondary";
  }
};

export function ProductWarehousePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialWarehouseId = useMemo(
    () => parsePositiveInt(searchParams.get("warehouseId")),
    [searchParams]
  );
  const initialSeasonId = useMemo(
    () => parsePositiveInt(searchParams.get("seasonId")),
    [searchParams]
  );
  const [activeTab, setActiveTab] = useState<ProductWarehouseTab>("on-hand");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<
    number | undefined
  >(initialWarehouseId);
  const [selectedLocationId, setSelectedLocationId] = useState<
    number | undefined
  >();
  const [selectedFarmId, setSelectedFarmId] = useState<number | undefined>();
  const [selectedPlotId, setSelectedPlotId] = useState<number | undefined>();
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | undefined>(initialSeasonId);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [harvestedFrom, setHarvestedFrom] = useState("");
  const [harvestedTo, setHarvestedTo] = useState("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [lotPage, setLotPage] = useState(0);
  const [transactionPage, setTransactionPage] = useState(0);
  const [selectedTraceLotId, setSelectedTraceLotId] = useState<number | undefined>(undefined);
  const [adjustingLot, setAdjustingLot] = useState<ProductWarehouseLot | null>(null);
  const [stockingOutLot, setStockingOutLot] = useState<ProductWarehouseLot | null>(null);
  const [subStandardLot, setSubStandardLot] = useState<ProductWarehouseLot | null>(null);
  const [adjustQuantityInput, setAdjustQuantityInput] = useState("");
  const [adjustNoteInput, setAdjustNoteInput] = useState("");
  const [adjustDialogError, setAdjustDialogError] = useState("");
  const [stockOutQuantityInput, setStockOutQuantityInput] = useState("");
  const [stockOutNoteInput, setStockOutNoteInput] = useState("");
  const [stockOutDialogError, setStockOutDialogError] = useState("");
  const [warehouseDialogMode, setWarehouseDialogMode] =
    useState<WarehouseDialogMode | null>(null);
  const [warehouseNameInput, setWarehouseNameInput] = useState("");
  const [warehouseFarmIdInput, setWarehouseFarmIdInput] = useState<
    number | undefined
  >(undefined);
  const [warehouseFormError, setWarehouseFormError] = useState("");
  const [showDeleteWarehouseDialog, setShowDeleteWarehouseDialog] =
    useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 300);

  const { data: warehouses, isLoading: loadingWarehouses } =
    useMyWarehouses("OUTPUT");
  const { data: farmsData } = useFarms({ active: true, page: 0, size: 200 });
  const outputWarehouses = useMemo(
    () => warehouses ?? [],
    [warehouses],
  );
  const selectedWarehouse = useMemo(
    () =>
      outputWarehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ??
      null,
    [outputWarehouses, selectedWarehouseId],
  );
  const { data: locations } = useLocations(selectedWarehouseId);
  const { data: overviewData } = useProductWarehouseOverview();
  const { data: plotsData } = usePlotsByFarm(
    selectedFarmId ?? 0,
    { page: 0, size: 100 },
    { enabled: !!selectedFarmId },
  );
  const { data: seasonsData } = useSeasons({
    farmId: selectedFarmId,
    plotId: selectedPlotId,
    page: 0,
    size: 100,
  });

  const {
    data: lotsData,
    isLoading: loadingLots,
    isError: lotsError,
  } = useProductWarehouseLots({
    warehouseId: selectedWarehouseId,
    locationId: selectedLocationId,
    seasonId: selectedSeasonId,
    farmId: selectedFarmId,
    plotId: selectedPlotId,
    harvestedFrom: harvestedFrom || undefined,
    harvestedTo: harvestedTo || undefined,
    status: statusFilter || undefined,
    q: debouncedSearch || undefined,
    page: lotPage,
    size: 20,
  });

  const {
    data: transactionsData,
    isLoading: loadingTransactions,
    isError: transactionsError,
  } = useProductWarehouseTransactions({
    from: harvestedFrom || undefined,
    to: harvestedTo || undefined,
    page: transactionPage,
    size: 20,
  });

  const {
    data: traceabilityData,
    isLoading: loadingTraceability,
    isError: traceabilityError,
  } = useProductWarehouseTraceability(selectedTraceLotId);

  const adjustMutation = useAdjustProductWarehouseLot();
  const stockOutMutation = useStockOutProductWarehouseLot();
  const createWarehouseMutation = useCreateWarehouse();
  const updateWarehouseMutation = useUpdateWarehouse();
  const deleteWarehouseMutation = useDeleteWarehouse();

  const farmOptions = useMemo(() => farmsData?.content ?? [], [farmsData?.content]);

  const handleFilterChange = () => {
    setLotPage(0);
    setTransactionPage(0);
  };

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedWarehouseId) {
      next.set("warehouseId", String(selectedWarehouseId));
    } else {
      next.delete("warehouseId");
    }

    if (selectedSeasonId) {
      next.set("seasonId", String(selectedSeasonId));
    } else {
      next.delete("seasonId");
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, selectedSeasonId, selectedWarehouseId, setSearchParams]);

  const handleOpenTraceability = (lotId: number) => {
    setSelectedTraceLotId(lotId);
    setActiveTab("traceability");
  };

  const openCreateWarehouseDialog = () => {
    setWarehouseDialogMode("create");
    setWarehouseNameInput("");
    setWarehouseFarmIdInput(selectedWarehouse?.farmId ?? farmOptions[0]?.id);
    setWarehouseFormError("");
  };

  const openEditWarehouseDialog = () => {
    if (!selectedWarehouse) return;
    setWarehouseDialogMode("edit");
    setWarehouseNameInput(selectedWarehouse.name ?? "");
    setWarehouseFarmIdInput(selectedWarehouse.farmId ?? undefined);
    setWarehouseFormError("");
  };

  const closeWarehouseDialog = () => {
    if (createWarehouseMutation.isPending || updateWarehouseMutation.isPending) {
      return;
    }
    setWarehouseDialogMode(null);
    setWarehouseNameInput("");
    setWarehouseFarmIdInput(undefined);
    setWarehouseFormError("");
  };
  const closeWarehouseDialogWithConfirm = () => {
    if (createWarehouseMutation.isPending || updateWarehouseMutation.isPending) return;
    const isDirty = warehouseDialogMode === "create"
      ? warehouseNameInput.trim().length > 0 || warehouseFarmIdInput !== undefined
      : warehouseNameInput !== (selectedWarehouse?.name ?? "");
    if (
      isDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }
    closeWarehouseDialog();
  };
  const closeAdjustDialog = () => {
    if (adjustMutation.isPending) return;
    const isDirty = adjustQuantityInput.trim().length > 0 || adjustNoteInput.trim().length > 0;
    if (
      isDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }
    setAdjustingLot(null);
    setAdjustDialogError("");
  };
  const closeStockOutDialog = () => {
    if (stockOutMutation.isPending) return;
    const isDirty = stockOutQuantityInput.trim().length > 0 || stockOutNoteInput.trim().length > 0;
    if (
      isDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }
    setStockingOutLot(null);
    setStockOutDialogError("");
  };
  const closeTraceabilityDetail = () => {
    setSelectedTraceLotId(undefined);
    setActiveTab("on-hand");
  };

  const submitWarehouseDialog = async () => {
    const trimmedName = warehouseNameInput.trim();
    if (!trimmedName) {
      setWarehouseFormError(t("productWarehouse.validation.warehouseNameRequired"));
      return;
    }

    const farmId =
      warehouseDialogMode === "create"
        ? warehouseFarmIdInput
        : selectedWarehouse?.farmId;
    if (!farmId) {
      setWarehouseFormError(t("productWarehouse.validation.farmRequired"));
      return;
    }

    setWarehouseFormError("");
    try {
      if (warehouseDialogMode === "create") {
        await createWarehouseMutation.mutateAsync({
          name: trimmedName,
          farmId,
          type: "OUTPUT",
        });
        toast.success(t("productWarehouse.toast.warehouseCreateSuccess"));
      } else if (warehouseDialogMode === "edit" && selectedWarehouse) {
        await updateWarehouseMutation.mutateAsync({
          id: selectedWarehouse.id,
          data: {
            name: trimmedName,
            farmId,
          },
        });
        toast.success(t("productWarehouse.toast.warehouseUpdateSuccess"));
      }
      closeWarehouseDialog();
    } catch (error) {
      setWarehouseFormError(
        error instanceof Error
          ? error.message
          : t("productWarehouse.toast.warehouseSaveError"),
      );
    }
  };

  const confirmDeleteWarehouse = async () => {
    if (!selectedWarehouseId) return;
    try {
      await deleteWarehouseMutation.mutateAsync(selectedWarehouseId);
      toast.success(t("productWarehouse.toast.warehouseDeleteSuccess"));
      setShowDeleteWarehouseDialog(false);
      setSelectedWarehouseId(undefined);
      setSelectedLocationId(undefined);
      setSelectedTraceLotId(undefined);
      setLotPage(0);
      setTransactionPage(0);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("productWarehouse.toast.warehouseDeleteError"),
      );
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const formatNumber = (value?: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
      value,
    );
  };

  const submitAdjust = async () => {
    if (!adjustingLot) return;
    const quantityDelta = Number(adjustQuantityInput);
    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      const message = t("productWarehouse.validation.adjustNotZero");
      setAdjustDialogError(message);
      toast.error(message);
      return;
    }
    if (!adjustNoteInput.trim()) {
      const message = t("productWarehouse.validation.adjustNoteRequired");
      setAdjustDialogError(message);
      toast.error(message);
      return;
    }

    setAdjustDialogError("");
    try {
      await adjustMutation.mutateAsync({
        lotId: adjustingLot.id,
        data: {
          quantityDelta,
          note: adjustNoteInput.trim(),
        },
      });
      toast.success(t("productWarehouse.toast.adjustSuccess"));
      setAdjustingLot(null);
      setAdjustQuantityInput("");
      setAdjustNoteInput("");
      setAdjustDialogError("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("productWarehouse.toast.error");
      setAdjustDialogError(message);
      toast.error(message);
    }
  };

  const submitStockOut = async () => {
    if (!stockingOutLot) return;
    const quantity = Number(stockOutQuantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      const message = t("productWarehouse.validation.stockOutPositive");
      setStockOutDialogError(message);
      toast.error(message);
      return;
    }

    setStockOutDialogError("");
    try {
      await stockOutMutation.mutateAsync({
        lotId: stockingOutLot.id,
        data: {
          quantity,
          note: stockOutNoteInput.trim() || undefined,
        },
      });
      toast.success(t("productWarehouse.toast.stockOutSuccess"));
      setStockingOutLot(null);
      setStockOutQuantityInput("");
      setStockOutNoteInput("");
      setStockOutDialogError("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("productWarehouse.toast.error");
      setStockOutDialogError(message);
      toast.error(message);
    }
  };

  const isWarehouseSubmitting =
    createWarehouseMutation.isPending || updateWarehouseMutation.isPending;

  return (
    <PageContainer variant="wide">
      <div className="farmer-product-warehouse-page">
        <div className="product-warehouse-page">
        <Card variant="page-header" className="mb-6">
          <CardContent className="px-6 py-4">
            <PageHeader
              className="mb-0"
              icon={<PackageCheck className="w-8 h-8" />}
              title={t("productWarehouse.title")}
              subtitle={t("productWarehouse.subtitle")}
              actions={
                <Button
                  size="sm"
                  variant="default"
                  type="button"
                  onClick={openCreateWarehouseDialog}
                  className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
                >
                  {t("productWarehouse.actions.addWarehouse")}
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Card variant="content" className="mb-6 bg-card/50 border-muted/60">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between divide-y sm:divide-y-0 sm:divide-x divide-border gap-4 sm:gap-0">
            <div className="flex items-center gap-4 px-4 flex-1 w-full">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Boxes className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-0.5">
                  {t("productWarehouse.summary.totalLots")}
                </p>
                <p className="text-2xl font-semibold text-foreground leading-none">{overviewData?.totalLots ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-4 flex-1 w-full">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <PackageCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-0.5">
                  {t("productWarehouse.summary.inStockLots")}
                </p>
                <p className="text-2xl font-semibold text-foreground leading-none">{overviewData?.inStockLots ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-4 flex-1 w-full">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <History className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-0.5">
                  {t("productWarehouse.summary.totalOnHand")}
                </p>
                <p className="text-2xl font-semibold text-foreground leading-none">
                  {formatNumber(overviewData?.totalOnHandQuantity)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="content" className="mb-6">
          <CardContent className="px-6 py-4">
            <div className="warehouse-directory-header">
              <h3>{t("productWarehouse.directory.title")}</h3>
              <span>{t("productWarehouse.directory.count", { count: outputWarehouses.length })}</span>
            </div>

            {outputWarehouses.length === 0 ? (
              <div className="empty-state small">
                {t("productWarehouse.directory.empty")}
              </div>
            ) : (
              <div className="warehouse-directory-grid">
                {outputWarehouses.map((warehouse) => {
                  const isSelected = selectedWarehouseId === warehouse.id;
                  return (
                    <button
                      key={warehouse.id}
                      type="button"
                      className={`warehouse-directory-item${isSelected ? " is-selected" : ""}`}
                      onClick={() => {
                        setSelectedWarehouseId(warehouse.id);
                        setSelectedLocationId(undefined);
                        handleFilterChange();
                      }}
                      >
                      <p className="warehouse-name">{warehouse.name}</p>
                      <p className="warehouse-meta">
                        {t("productWarehouse.directory.farm")}: {warehouse.farmName || "-"}
                      </p>
                      <p className="warehouse-meta">
                        {t("productWarehouse.directory.type")}: {warehouse.type || "OUTPUT"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="filter" className="mb-6">
          <CardContent className="px-6 py-4">
            <div className="product-warehouse-filters">
              <div className="control-group flex-1">
                <label htmlFor="pw-warehouse-filter">
                  {t("productWarehouse.filters.warehouse")}
                </label>
                <div className="flex gap-2 items-center">
                  <select
                    id="pw-warehouse-filter"
                    value={selectedWarehouseId ?? ""}
                    disabled={loadingWarehouses}
                    onChange={(event) => {
                      setSelectedWarehouseId(
                        event.target.value ? Number(event.target.value) : undefined,
                      );
                      setSelectedLocationId(undefined);
                      handleFilterChange();
                    }}
                    className="flex-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    <option value="">
                      {t("productWarehouse.filters.allWarehouses")}
                    </option>
                    {outputWarehouses.map((warehouse: WarehouseEntity) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={openEditWarehouseDialog}
                    disabled={!selectedWarehouse}
                    className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    {t("productWarehouse.actions.editWarehouse")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    type="button"
                    onClick={() => setShowDeleteWarehouseDialog(true)}
                    disabled={!selectedWarehouse}
                    className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background"
                  >
                    {t("productWarehouse.actions.deleteWarehouse")}
                  </Button>
                </div>
              </div>

              {showAdvancedFilters && (
                <>
                  <div className="control-group">
                    <label htmlFor="pw-location-filter">
                      {t("productWarehouse.filters.location")}
                    </label>
                    <select
                      id="pw-location-filter"
                      value={selectedLocationId ?? ""}
                      onChange={(event) => {
                        setSelectedLocationId(
                          event.target.value ? Number(event.target.value) : undefined,
                        );
                        handleFilterChange();
                      }}
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                    >
                      <option value="">
                        {t("productWarehouse.filters.allLocations")}
                      </option>
                      {(locations ?? []).map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.label || t("productWarehouse.filters.locationFallback", { id: location.id })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="control-group">
                    <label htmlFor="pw-farm-filter">
                      {t("productWarehouse.filters.farm")}
                    </label>
                    <select
                      id="pw-farm-filter"
                      value={selectedFarmId ?? ""}
                      onChange={(event) => {
                        setSelectedFarmId(
                          event.target.value ? Number(event.target.value) : undefined,
                        );
                        setSelectedPlotId(undefined);
                        handleFilterChange();
                      }}
                    >
                      <option value="">{t("productWarehouse.filters.allFarms")}</option>
                      {farmOptions.map((farm) => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="control-group">
                    <label htmlFor="pw-plot-filter">
                      {t("productWarehouse.filters.plot")}
                    </label>
                    <select
                      id="pw-plot-filter"
                      value={selectedPlotId ?? ""}
                      onChange={(event) => {
                        setSelectedPlotId(
                          event.target.value ? Number(event.target.value) : undefined,
                        );
                        handleFilterChange();
                      }}
                    >
                      <option value="">{t("productWarehouse.filters.allPlots")}</option>
                      {(plotsData?.items ?? []).map((plot) => (
                        <option key={plot.id} value={plot.id}>
                          {plot.plotName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="control-group">
                    <label htmlFor="pw-season-filter">
                      {t("productWarehouse.filters.season")}
                    </label>
                    <select
                      id="pw-season-filter"
                      value={selectedSeasonId ?? ""}
                      onChange={(event) => {
                        setSelectedSeasonId(
                          event.target.value ? Number(event.target.value) : undefined,
                        );
                        handleFilterChange();
                      }}
                    >
                      <option value="">
                        {t("productWarehouse.filters.allSeasons")}
                      </option>
                      {(seasonsData?.items ?? []).map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.seasonName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="control-group">
                    <label htmlFor="pw-status-filter">
                      {t("productWarehouse.filters.status")}
                    </label>
                    <select
                      id="pw-status-filter"
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value);
                        handleFilterChange();
                      }}
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                    >
                      <option value="">
                        {t("productWarehouse.filters.allStatuses")}
                      </option>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="control-group">
                    <label htmlFor="pw-from">
                      {t("productWarehouse.filters.harvestDateFrom")}
                    </label>
                    <input
                      id="pw-from"
                      type="date"
                      value={harvestedFrom}
                      onChange={(event) => {
                        setHarvestedFrom(event.target.value);
                        handleFilterChange();
                      }}
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                    />
                  </div>

                  <div className="control-group">
                    <label htmlFor="pw-to">
                      {t("productWarehouse.filters.harvestDateTo")}
                    </label>
                    <input
                      id="pw-to"
                      type="date"
                      value={harvestedTo}
                      onChange={(event) => {
                        setHarvestedTo(event.target.value);
                        handleFilterChange();
                      }}
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                    />
                  </div>
                </>
              )}

              <div className="control-group control-group--search">
                <label htmlFor="pw-search">
                  {t("productWarehouse.filters.search")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="pw-search"
                    type="text"
                    value={searchInput}
                    placeholder={t("productWarehouse.filters.searchPlaceholder")}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                      handleFilterChange();
                    }}
                    className="flex-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="min-h-[44px] whitespace-nowrap shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    {showAdvancedFilters ? t("common.hideAdvancedFilters", "Ẩn bộ lọc") : t("common.showAdvancedFilters", "Lọc nâng cao")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="product-warehouse-tabs">
          <button
            className={`tab ${activeTab === "on-hand" ? "active" : ""}`}
            onClick={() => setActiveTab("on-hand")}
          >
            {t("productWarehouse.tabs.onHand")}
          </button>
          <button
            className={`tab ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            {t("productWarehouse.tabs.transactions")}
          </button>
          <button
            className={`tab ${activeTab === "traceability" ? "active" : ""}`}
            onClick={() => setActiveTab("traceability")}
          >
            {t("productWarehouse.tabs.traceability")}
          </button>
        </div>

        <div className="product-warehouse-content">
          {activeTab === "on-hand" && (
            <>
              {loadingLots && (
                <div className="loading-state">
                  {t("productWarehouse.loadingLots")}
                </div>
              )}
              {!loadingLots && lotsError && (
                <div className="error-state">
                  {t("productWarehouse.errorLots")}
                </div>
              )}
              {!loadingLots && !lotsError && (lotsData?.items?.length ?? 0) === 0 && (
                <div className="empty-state">{t("productWarehouse.emptyLots")}</div>
              )}
              {!loadingLots && !lotsError && (lotsData?.items?.length ?? 0) > 0 && (
                <div className="table-container">
                  <table className="product-warehouse-table">
                    <thead>
                      <tr>
                        <th>{t("productWarehouse.table.lotCode")}</th>
                        <th>{t("productWarehouse.table.productName")}</th>
                        <th>{t("productWarehouse.table.variant")}</th>
                        <th>Đóng gói</th>
                        <th>{t("productWarehouse.table.unit")}</th>
                        <th>{t("productWarehouse.table.harvestedAt")}</th>
                        <th>{t("productWarehouse.table.receivedAt")}</th>
                        <th>Ngày hết hạn</th>
                        <th>{t("productWarehouse.table.farmPlot")}</th>
                        <th>{t("productWarehouse.table.season")}</th>
                        <th>{t("productWarehouse.table.location")}</th>
                        <th>{t("productWarehouse.table.quality")}</th>
                        <th>{t("productWarehouse.table.onHand")}</th>
                        <th>{t("productWarehouse.table.status")}</th>
                        <th>{t("productWarehouse.table.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(lotsData?.items ?? []).map((lot: any) => {
                        // Logic kiểm tra kho chuyên biệt
                        const isSensitive = lot.cropCategory === "VEGETABLE" || lot.cropCategory === "FRUIT";
                        const hasColdChainAlert = isSensitive && lot.hasTemperatureAlert; // giả lập field có alert
                        
                        return (
                        <tr key={lot.id} className={hasColdChainAlert ? "bg-red-50" : ""}>
                          <td>{lot.lotCode}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              {lot.productName}
                              {hasColdChainAlert && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-100 px-2 py-0.5 rounded-full" title="Tổn thương do lạnh">
                                  <AlertCircle className="w-3 h-3" />
                                  Cảnh báo Lạnh
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{lot.productVariant || "-"}</td>
                          <td>
                            {lot.packagingType && lot.packagingType !== "NONE" 
                              ? `${lot.packagingType} (${lot.packagingCount || 0})` 
                              : "-"}
                          </td>
                          <td>{lot.unit || "-"}</td>
                          <td>{formatDate(lot.harvestedAt)}</td>
                          <td>{formatDateTime(lot.receivedAt)}</td>
                          <td className={hasColdChainAlert ? "text-red-600 font-medium" : ""}>
                            {formatDate(lot.expiryDate)}
                          </td>
                          <td>{`${lot.farmName || "-"} / ${lot.plotName || "-"}`}</td>
                          <td>{lot.seasonName || "-"}</td>
                          <td>{lot.locationLabel || "-"}</td>
                          <td>{lot.grade || lot.qualityStatus || "-"}</td>
                          <td>
                            {formatNumber(lot.onHandQuantity)} {lot.unit}
                          </td>
                          <td>
                            <Badge
                              variant="secondary"
                              className={getLotStatusBadgeClassName(lot.status)}
                            >
                              {lot.status || "-"}
                            </Badge>
                          </td>
                          <td className="actions">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0 transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenTraceability(lot.id)}>
                                  {t("productWarehouse.actions.viewTraceability")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setAdjustingLot(lot);
                                  setAdjustQuantityInput("");
                                  setAdjustNoteInput("");
                                  setAdjustDialogError("");
                                }}>
                                  {t("productWarehouse.actions.adjust")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setStockingOutLot(lot);
                                  setStockOutQuantityInput("");
                                  setStockOutNoteInput("");
                                  setStockOutDialogError("");
                                }}>
                                  {t("productWarehouse.actions.stockOut")}
                                </DropdownMenuItem>
                                {lot.qualityStatus === "SUBSTANDARD" && (
                                  <DropdownMenuItem onClick={() => setSubStandardLot(lot)} className="text-destructive">
                                    Xuất kho Không đạt chuẩn
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              )}
              {lotsData && lotsData.totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={lotPage === 0}
                    onClick={() => setLotPage((page) => page - 1)}
                  >
                    {t("common.previous")}
                  </button>
                  <span>
                    {t("pagination.page")} {lotPage + 1} / {lotsData.totalPages}
                  </span>
                  <button
                    disabled={lotPage >= lotsData.totalPages - 1}
                    onClick={() => setLotPage((page) => page + 1)}
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === "transactions" && (
            <>
              {loadingTransactions && (
                <div className="loading-state">
                  {t("productWarehouse.loadingTransactions")}
                </div>
              )}
              {!loadingTransactions && transactionsError && (
                <div className="error-state">
                  {t("productWarehouse.errorTransactions")}
                </div>
              )}
              {!loadingTransactions &&
                !transactionsError &&
                (transactionsData?.items?.length ?? 0) === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <History className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Chưa có giao dịch nào</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      Kho của bạn hiện tại chưa có bất kỳ giao dịch xuất/nhập nào. Bắt đầu quản lý bằng cách thêm một lô hàng mới.
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab("on-hand")}>
                      Quay lại Danh sách Lô hàng
                    </Button>
                  </div>
                )}
              {!loadingTransactions &&
                !transactionsError &&
                (transactionsData?.items?.length ?? 0) > 0 && (
                  <div className="table-container">
                    <table className="product-warehouse-table">
                      <thead>
                        <tr>
                          <th>{t("productWarehouse.transactionsTable.createdAt")}</th>
                          <th>{t("productWarehouse.transactionsTable.type")}</th>
                          <th>{t("productWarehouse.transactionsTable.lotCode")}</th>
                          <th>{t("productWarehouse.transactionsTable.quantity")}</th>
                          <th>
                            {t("productWarehouse.transactionsTable.resultingOnHand")}
                          </th>
                          <th>{t("productWarehouse.transactionsTable.reference")}</th>
                          <th>{t("productWarehouse.transactionsTable.createdBy")}</th>
                          <th>{t("productWarehouse.transactionsTable.note")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(transactionsData?.items ?? []).map((tx) => (
                          <tr key={tx.id}>
                            <td>{formatDateTime(tx.createdAt)}</td>
                            <td>{tx.transactionType || "-"}</td>
                            <td>{tx.lotCode || "-"}</td>
                            <td>
                              {formatNumber(tx.quantity)} {tx.unit || ""}
                            </td>
                            <td>
                              {formatNumber(tx.resultingOnHand)} {tx.unit || ""}
                            </td>
                            <td>
                              {tx.referenceType
                                ? `${tx.referenceType} #${tx.referenceId || "-"}`
                                : "-"}
                            </td>
                            <td>{tx.createdByName || "-"}</td>
                            <td>{tx.note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              {transactionsData && transactionsData.totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={transactionPage === 0}
                    onClick={() => setTransactionPage((page) => page - 1)}
                  >
                    {t("common.previous")}
                  </button>
                  <span>
                    {t("pagination.page")} {transactionPage + 1} /{" "}
                    {transactionsData.totalPages}
                  </span>
                  <button
                    disabled={transactionPage >= transactionsData.totalPages - 1}
                    onClick={() => setTransactionPage((page) => page + 1)}
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === "traceability" && (
            <>
              {!selectedTraceLotId && (
                <div className="empty-state">
                  {t("productWarehouse.emptyTraceability")}
                </div>
              )}
              {selectedTraceLotId && loadingTraceability && (
                <div className="loading-state">
                  {t("productWarehouse.loadingTraceability")}
                </div>
              )}
              {selectedTraceLotId && !loadingTraceability && traceabilityError && (
                <div className="error-state">
                  {t("productWarehouse.errorTraceability")}
                </div>
              )}
              {selectedTraceLotId && traceabilityData && (
                <div className="traceability-panel">
                  <div className="traceability-header">
                    <div>
                      <BackButton onClick={closeTraceabilityDetail} className="mb-2 w-fit" />
                      <h3>
                        {traceabilityData.productName} - {traceabilityData.lotCode}
                      </h3>
                    </div>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="traceability-grid">
                    <p>
                      <strong>{t("productWarehouse.traceability.season")}:</strong>{" "}
                      {traceabilityData.seasonName || "-"}
                    </p>
                    <p>
                      <strong>{t("productWarehouse.traceability.farmPlot")}:</strong>{" "}
                      {`${traceabilityData.farmName || "-"} / ${traceabilityData.plotName || "-"}`}
                    </p>
                    <p>
                      <strong>{t("productWarehouse.traceability.harvestedAt")}:</strong>{" "}
                      {formatDate(traceabilityData.harvestedAt)}
                    </p>
                    <p>
                      <strong>{t("productWarehouse.traceability.recordedBy")}:</strong>{" "}
                      {traceabilityData.recordedByName || "-"}
                    </p>
                    <p>
                      <strong>
                        {t("productWarehouse.traceability.initialQuantity")}:
                      </strong>{" "}
                      {formatNumber(traceabilityData.initialQuantity)}{" "}
                      {traceabilityData.unit}
                    </p>
                    <p>
                      <strong>
                        {t("productWarehouse.traceability.onHandQuantity")}:
                      </strong>{" "}
                      {formatNumber(traceabilityData.onHandQuantity)}{" "}
                      {traceabilityData.unit}
                    </p>
                    <p>
                      <strong>{t("productWarehouse.traceability.harvestRef")}:</strong>{" "}
                      {traceabilityData.harvestId || "-"}
                    </p>
                  </div>

                  <h4 className="traceability-subtitle">
                    {t("productWarehouse.traceability.transactions")}
                  </h4>
                  {traceabilityData.transactions.length === 0 ? (
                    <div className="empty-state small">
                      {t("productWarehouse.emptyTransactions")}
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="product-warehouse-table">
                        <thead>
                          <tr>
                            <th>{t("productWarehouse.transactionsTable.createdAt")}</th>
                            <th>{t("productWarehouse.transactionsTable.type")}</th>
                            <th>{t("productWarehouse.transactionsTable.quantity")}</th>
                            <th>
                              {t("productWarehouse.transactionsTable.resultingOnHand")}
                            </th>
                            <th>{t("productWarehouse.transactionsTable.note")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {traceabilityData.transactions.map((tx) => (
                            <tr key={tx.id}>
                              <td>{formatDateTime(tx.createdAt)}</td>
                              <td>{tx.transactionType || "-"}</td>
                              <td>
                                {formatNumber(tx.quantity)} {tx.unit || ""}
                              </td>
                              <td>
                                {formatNumber(tx.resultingOnHand)} {tx.unit || ""}
                              </td>
                              <td>{tx.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      <Dialog
        open={warehouseDialogMode !== null}
        onOpenChange={(open) => !open && closeWarehouseDialogWithConfirm()}
      >
        <DialogContent className="sm:max-w-[500px]" closeDisabled={isWarehouseSubmitting}>
          <DialogHeader>
            <BackButton onClick={closeWarehouseDialogWithConfirm} className="w-fit" />
            <DialogTitle>
              {warehouseDialogMode === "create"
                ? t("productWarehouse.dialog.addWarehouseTitle")
                : t("productWarehouse.dialog.editWarehouseTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("productWarehouse.dialog.warehouseHint")}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitWarehouseDialog();
            }}
          >
            {warehouseFormError && (
              <p id="product-warehouse-form-error" role="alert" className="text-sm text-destructive">
                {warehouseFormError}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="warehouse-name" required>
                {t("productWarehouse.form.warehouseNameLabel")}
              </Label>
              <Input
                id="warehouse-name"
                type="text"
                value={warehouseNameInput}
                maxLength={150}
                onChange={(event) => setWarehouseNameInput(event.target.value)}
                placeholder={t("productWarehouse.form.warehouseNamePlaceholder")}
                aria-invalid={!!warehouseFormError}
                aria-describedby={warehouseFormError ? "product-warehouse-form-error" : undefined}
                disabled={isWarehouseSubmitting}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse-farm" required>
                {t("productWarehouse.form.farmLabel")}
              </Label>
              <Select
                value={warehouseFarmIdInput ? String(warehouseFarmIdInput) : undefined}
                onValueChange={(value) => setWarehouseFarmIdInput(Number(value))}
                disabled={warehouseDialogMode === "edit" || isWarehouseSubmitting}
              >
                <SelectTrigger
                  id="warehouse-farm"
                  aria-invalid={!!warehouseFormError}
                  aria-describedby={warehouseFormError ? "product-warehouse-form-error" : undefined}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  <SelectValue placeholder={t("productWarehouse.form.selectFarm")} />
                </SelectTrigger>
                <SelectContent>
                  {farmOptions.map((farm) => (
                    <SelectItem key={farm.id} value={String(farm.id)}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={closeWarehouseDialogWithConfirm}
                disabled={isWarehouseSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isWarehouseSubmitting} className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
                {isWarehouseSubmitting ? t("common.processing") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteWarehouseDialog && !!selectedWarehouse}
        onOpenChange={(open) =>
          !open && !deleteWarehouseMutation.isPending && setShowDeleteWarehouseDialog(false)
        }
      >
        <DialogContent className="sm:max-w-[500px]" closeDisabled={deleteWarehouseMutation.isPending}>
          <DialogHeader>
            <DialogTitle>{t("productWarehouse.dialog.deleteWarehouseTitle")}</DialogTitle>
            <DialogDescription>
              {t("productWarehouse.dialog.deleteWarehouseDescription", { warehouseName: selectedWarehouse?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("productWarehouse.dialog.deleteWarehouseHint")}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setShowDeleteWarehouseDialog(false)}
              disabled={deleteWarehouseMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteWarehouse}
              disabled={deleteWarehouseMutation.isPending}
              className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background"
            >
              {deleteWarehouseMutation.isPending ? t("common.processing") : t("productWarehouse.actions.deleteWarehouse")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!adjustingLot}
        onOpenChange={(open) => {
          if (!open) closeAdjustDialog();
        }}
      >
        <DialogContent className="sm:max-w-[500px]" closeDisabled={adjustMutation.isPending}>
          <DialogHeader>
            <BackButton onClick={closeAdjustDialog} className="w-fit" />
            <DialogTitle>{t("productWarehouse.dialog.adjustTitle")}</DialogTitle>
            <DialogDescription>
              {adjustingLot?.lotCode} - {adjustingLot?.productName}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAdjust();
            }}
          >
            {adjustDialogError && (
              <p id="product-warehouse-adjust-error" role="alert" className="text-sm text-destructive">
                {adjustDialogError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="adjust-qty" required>
                {t("productWarehouse.dialog.adjustQuantity")}
              </Label>
              <Input
                id="adjust-qty"
                type="number"
                value={adjustQuantityInput}
                onChange={(event) => setAdjustQuantityInput(event.target.value)}
                placeholder={t("productWarehouse.dialog.adjustQuantityPlaceholder")}
                aria-invalid={!!adjustDialogError}
                aria-describedby={adjustDialogError ? "product-warehouse-adjust-error" : undefined}
                disabled={adjustMutation.isPending}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-note" required>
                {t("productWarehouse.dialog.adjustNote")}
              </Label>
              <Textarea
                id="adjust-note"
                value={adjustNoteInput}
                onChange={(event) => setAdjustNoteInput(event.target.value)}
                placeholder={t("productWarehouse.dialog.adjustNotePlaceholder")}
                aria-invalid={!!adjustDialogError}
                aria-describedby={adjustDialogError ? "product-warehouse-adjust-error" : undefined}
                disabled={adjustMutation.isPending}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={closeAdjustDialog}
                disabled={adjustMutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={adjustMutation.isPending} className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
                {adjustMutation.isPending
                  ? t("common.processing")
                  : t("productWarehouse.dialog.adjustConfirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!stockingOutLot}
        onOpenChange={(open) => {
          if (!open) closeStockOutDialog();
        }}
      >
        <DialogContent className="sm:max-w-[500px]" closeDisabled={stockOutMutation.isPending}>
          <DialogHeader>
            <BackButton onClick={closeStockOutDialog} className="w-fit" />
            <DialogTitle>{t("productWarehouse.dialog.stockOutTitle")}</DialogTitle>
            <DialogDescription>
              {stockingOutLot?.lotCode} - {stockingOutLot?.productName}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitStockOut();
            }}
          >
            {stockOutDialogError && (
              <p id="product-warehouse-stockout-error" role="alert" className="text-sm text-destructive">
                {stockOutDialogError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="stockout-qty" required>
                {t("productWarehouse.dialog.stockOutQuantity")}
              </Label>
              <Input
                id="stockout-qty"
                type="number"
                min={0}
                value={stockOutQuantityInput}
                onChange={(event) => setStockOutQuantityInput(event.target.value)}
                placeholder={t("productWarehouse.dialog.stockOutQuantityPlaceholder")}
                aria-invalid={!!stockOutDialogError}
                aria-describedby={stockOutDialogError ? "product-warehouse-stockout-error" : undefined}
                disabled={stockOutMutation.isPending}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockout-note">
                {t("productWarehouse.dialog.stockOutNote")}
              </Label>
              <Textarea
                id="stockout-note"
                value={stockOutNoteInput}
                onChange={(event) => setStockOutNoteInput(event.target.value)}
                placeholder={t("productWarehouse.dialog.stockOutNotePlaceholder")}
                disabled={stockOutMutation.isPending}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={closeStockOutDialog}
                disabled={stockOutMutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={stockOutMutation.isPending}
                className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
              >
                {stockOutMutation.isPending
                  ? t("common.processing")
                  : t("productWarehouse.dialog.stockOutConfirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SubStandardDisposalModal
        open={!!subStandardLot}
        onOpenChange={(open) => {
          if (!open) setSubStandardLot(null);
        }}
        lot={subStandardLot}
        onSuccess={() => {
          setSubStandardLot(null);
          // Refetch data - queryClient.invalidateQueries doesn't have an exact hook here, 
          // so triggering state change or reload
          window.location.reload();
        }}
      />
    </PageContainer>
  );
}

export default ProductWarehousePage;


