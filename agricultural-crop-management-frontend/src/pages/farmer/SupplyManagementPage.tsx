import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  useCreateWarehouse,
  useDeleteWarehouse,
  useLocations,
  useMovements,
  useMyWarehouses,
  useOnHandList,
  useRecordStockMovement,
  useUpdateWarehouse,
  type MovementsParams,
  type OnHandParams,
  type OnHandRow,
  type StockMovementRequest,
  type StockMovement,
  type Warehouse as WarehouseEntity,
  type StockLocation,
} from "@/entities/inventory";
import {
  useAllSuppliers,
  useAllSupplyItems,
  useCreateSupplyItem,
  useCreateSupplier,
  useDeleteSupplyItem,
  useDeleteSupplier,
  useStockIn,
  useSuppliers,
  useSupplyItems,
  useSupplyLots,
  useUpdateSupplyItem,
  useUpdateSupplier,
  type CreateSupplyItemRequest,
  type CreateSupplierRequest,
  type StockInRequest,
  type Supplier,
  type SupplyItem,
  type SupplyLot,
} from "@/entities/supplies";
import { useFarms } from "@/entities/farm";
import type { WeightUnit } from "@/entities/preferences";
import { usePreferences } from "@/shared/contexts";
import {
  convertWeight,
  convertWeightToKg,
  getWeightUnitLabel,
  normalizeWeightUnit,
} from "@/shared/lib";
import {
  BackButton,
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
import {
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Package,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import "./SupplyManagementPage.css";

// ═══════════════════════════════════════════════════════════════
// HELPERS (from InventoryPage)
// ═══════════════════════════════════════════════════════════════

type TranslateFn = ReturnType<typeof useTranslation>["t"];

const useSupplyManagementI18n = () => {
  const { t, i18n } = useTranslation();
  return { t, locale: i18n.language || "en" };
};

const formatNumber = (
  value: number,
  locale: string,
  maximumFractionDigits?: number,
) => new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);

const getDisplayQuantity = (
  quantity: number,
  unit: string | null | undefined,
  displayUnit: WeightUnit,
  locale: string,
) => {
  const normalizedUnit = normalizeWeightUnit(unit);
  if (!normalizedUnit) {
    return {
      formatted: formatNumber(quantity, locale),
      displayValue: quantity,
      unitLabel: unit ?? "",
      normalizedUnit: null,
    };
  }

  const valueKg = convertWeightToKg(quantity, normalizedUnit);
  const displayValue = convertWeight(valueKg, displayUnit);
  const formatted = formatNumber(
    displayValue,
    locale,
    displayUnit === "G" ? 0 : 2,
  );

  return {
    formatted,
    displayValue,
    unitLabel: getWeightUnitLabel(displayUnit),
    normalizedUnit,
  };
};

const toRowUnitQuantity = (
  quantity: number,
  rowUnit: WeightUnit,
  displayUnit: WeightUnit,
) => convertWeight(convertWeightToKg(quantity, displayUnit), rowUnit);

const getLotStatusMeta = (
  status: string | null | undefined,
  t: TranslateFn,
): { label: string; className: string } => {
  const normalized = status?.trim().toUpperCase();
  switch (normalized) {
    case "IN_STOCK":
      return { label: t("inventory.status.inStock"), className: "status-in-stock" };
    case "LOW_STOCK":
      return { label: t("inventory.status.lowStock"), className: "status-low-stock" };
    case "EXPIRED":
      return { label: t("inventory.status.expired"), className: "status-expired" };
    case "OUT_OF_STOCK":
    case "DEPLETED":
      return { label: t("inventory.status.outOfStock"), className: "status-out-of-stock" };
    case "HOLD":
    case "RESERVED":
    case "PENDING":
      return { label: t("inventory.status.hold"), className: "status-hold" };
    default:
      return {
        label: status?.trim() || "-",
        className: "status-neutral",
      };
  }
};

const getMovementTypeMeta = (
  movementType: string | null | undefined,
  t: TranslateFn,
): { label: string; className: string } => {
  switch (movementType) {
    case "IN":
      return { label: t("inventory.types.in"), className: "movement-in" };
    case "OUT":
      return { label: t("inventory.types.out"), className: "movement-out" };
    case "ADJUST":
      return { label: t("inventory.types.adjust"), className: "movement-adjust" };
    default:
      return { label: movementType || "-", className: "" };
  }
};

const getLocationDisplayLabel = (
  locationLabel: string | null | undefined,
  t: TranslateFn,
): string => {
  const normalized = locationLabel?.trim().toLowerCase();
  if (!normalized || normalized === "any location") {
    return t("inventory.unassignedLocation");
  }
  return locationLabel ?? t("inventory.unassignedLocation");
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

type TabType = "suppliers" | "items" | "lots" | "on-hand" | "movements";
type WarehouseDialogMode = "create" | "edit";

export function SupplyManagementPage() {
  const { t } = useSupplyManagementI18n();
  const { preferences } = usePreferences();
  const [activeTab, setActiveTab] = useState<TabType>("on-hand");

  // ===== Supplier CRUD state =====
  const [showSupplierFormDialog, setShowSupplierFormDialog] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [showDeleteSupplierDialog, setShowDeleteSupplierDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // ===== Supply Item CRUD state =====
  const [showItemFormDialog, setShowItemFormDialog] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<SupplyItem | null>(null);
  const [showDeleteItemDialog, setShowDeleteItemDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SupplyItem | null>(null);

  // ===== Stock In state =====
  const [showStockInModal, setShowStockInModal] = useState(false);

  // ===== Suppliers tab state =====
  const [suppliersSearch, setSuppliersSearch] = useState("");
  const [itemsSearch, setItemsSearch] = useState("");
  const [itemsRestrictedFilter, setItemsRestrictedFilter] = useState<boolean | undefined>(undefined);
  const [lotsSearch, setLotsSearch] = useState("");
  const [lotsItemFilter, setLotsItemFilter] = useState<number | undefined>(undefined);
  const [lotsSupplierFilter, setLotsSupplierFilter] = useState<number | undefined>(undefined);

  // ===== Inventory tab state =====
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [warehouseDialogMode, setWarehouseDialogMode] = useState<WarehouseDialogMode | null>(null);
  const [warehouseNameInput, setWarehouseNameInput] = useState("");
  const [warehouseFarmIdInput, setWarehouseFarmIdInput] = useState<number | undefined>(undefined);
  const [warehouseFormError, setWarehouseFormError] = useState("");
  const [showDeleteWarehouseModal, setShowDeleteWarehouseModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [stockOutRow, setStockOutRow] = useState<OnHandRow | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustRow, setAdjustRow] = useState<OnHandRow | null>(null);

  // ===== Pagination (shared) =====
  const [page, setPage] = useState(0);

  // ===== QUERIES (Suppliers) =====
  const { data: suppliersData, isLoading: loadingSuppliers } = useSuppliers({
    q: suppliersSearch || undefined,
    page,
    size: 20,
  });
  const { data: itemsData, isLoading: loadingItems } = useSupplyItems({
    q: itemsSearch || undefined,
    restricted: itemsRestrictedFilter,
    page,
    size: 20,
  });
  const { data: lotsData, isLoading: loadingLots } = useSupplyLots({
    itemId: lotsItemFilter,
    supplierId: lotsSupplierFilter,
    q: lotsSearch || undefined,
    page,
    size: 20,
  });
  const { data: allSuppliers } = useAllSuppliers();
  const { data: allItems } = useAllSupplyItems();

  // ===== QUERIES (Inventory) =====
  const { data: warehouses, isLoading: loadingWarehouses } = useMyWarehouses("INPUT");
  const { data: farmsData } = useFarms({ active: true, page: 0, size: 200 });
  const supplyWarehouses = useMemo(() => warehouses ?? [], [warehouses]);
  const farmOptions = useMemo(() => farmsData?.content ?? [], [farmsData?.content]);
  const selectedWarehouse = useMemo(
    () => supplyWarehouses.find((w) => w.id === selectedWarehouseId) ?? null,
    [selectedWarehouseId, supplyWarehouses],
  );
  const { data: locations } = useLocations(selectedWarehouseId);

  const onHandParams: OnHandParams | undefined = selectedWarehouseId
    ? {
        warehouseId: selectedWarehouseId,
        locationId: selectedLocationId,
        q: searchQuery || undefined,
        page,
        size: 20,
      }
    : undefined;

  const movementsParams: MovementsParams | undefined = selectedWarehouseId
    ? {
        warehouseId: selectedWarehouseId,
        type: movementTypeFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page,
        size: 20,
      }
    : undefined;

  const { data: onHandData, isLoading: loadingOnHand } = useOnHandList(onHandParams);
  const { data: movementsData, isLoading: loadingMovements } = useMovements(movementsParams);

  // ===== MUTATIONS =====
  const stockInMutation = useStockIn();
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();
  const createSupplyItemMutation = useCreateSupplyItem();
  const updateSupplyItemMutation = useUpdateSupplyItem();
  const deleteSupplyItemMutation = useDeleteSupplyItem();
  const recordMovementMutation = useRecordStockMovement();
  const createWarehouseMutation = useCreateWarehouse();
  const updateWarehouseMutation = useUpdateWarehouse();
  const deleteWarehouseMutation = useDeleteWarehouse();

  // Auto-select first warehouse
  if (
    supplyWarehouses.length > 0 &&
    (!selectedWarehouseId || !supplyWarehouses.some((w) => w.id === selectedWarehouseId))
  ) {
    setSelectedWarehouseId(supplyWarehouses[0].id);
  }
  if (supplyWarehouses.length === 0 && selectedWarehouseId) {
    setSelectedWarehouseId(undefined);
  }

  // ===== TAB CHANGE =====
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(0);
  };

  // ===== SUPPLIER HANDLERS =====
  const handleAddSupplier = () => {
    setSupplierToEdit(null);
    setShowSupplierFormDialog(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setShowSupplierFormDialog(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteSupplierDialog(true);
  };

  const handleSupplierFormSubmit = async (data: CreateSupplierRequest) => {
    if (supplierToEdit) {
      await updateSupplierMutation.mutateAsync({ id: supplierToEdit.id, data });
    } else {
      await createSupplierMutation.mutateAsync(data);
    }
    setShowSupplierFormDialog(false);
    setSupplierToEdit(null);
  };

  const handleConfirmDeleteSupplier = async () => {
    if (supplierToDelete) {
      await deleteSupplierMutation.mutateAsync(supplierToDelete.id);
      setShowDeleteSupplierDialog(false);
      setSupplierToDelete(null);
    }
  };

  // ===== SUPPLY ITEM HANDLERS =====
  const handleAddItem = () => {
    setItemToEdit(null);
    setShowItemFormDialog(true);
  };

  const handleEditItem = (item: SupplyItem) => {
    setItemToEdit(item);
    setShowItemFormDialog(true);
  };

  const handleDeleteItem = (item: SupplyItem) => {
    setItemToDelete(item);
    setShowDeleteItemDialog(true);
  };

  const handleItemFormSubmit = async (data: CreateSupplyItemRequest) => {
    if (itemToEdit) {
      await updateSupplyItemMutation.mutateAsync({ id: itemToEdit.id, data });
    } else {
      await createSupplyItemMutation.mutateAsync(data);
    }
    setShowItemFormDialog(false);
    setItemToEdit(null);
  };

  const handleConfirmDeleteItem = async () => {
    if (itemToDelete) {
      await deleteSupplyItemMutation.mutateAsync(itemToDelete.id);
      setShowDeleteItemDialog(false);
      setItemToDelete(null);
    }
  };

  // ===== WAREHOUSE HANDLERS =====
  const handleWarehouseChange = (warehouseId: number) => {
    setSelectedWarehouseId(warehouseId);
    setSelectedLocationId(undefined);
    setPage(0);
  };

  const openCreateWarehouseModal = () => {
    setWarehouseDialogMode("create");
    setWarehouseNameInput("");
    setWarehouseFarmIdInput(selectedWarehouse?.farmId ?? farmOptions[0]?.id);
    setWarehouseFormError("");
  };

  const openEditWarehouseModal = () => {
    if (!selectedWarehouse) return;
    setWarehouseDialogMode("edit");
    setWarehouseNameInput(selectedWarehouse.name ?? "");
    setWarehouseFarmIdInput(selectedWarehouse.farmId ?? undefined);
    setWarehouseFormError("");
  };

  const closeWarehouseFormModal = () => {
    if (createWarehouseMutation.isPending || updateWarehouseMutation.isPending) return;
    setWarehouseDialogMode(null);
    setWarehouseNameInput("");
    setWarehouseFarmIdInput(undefined);
    setWarehouseFormError("");
  };

  const handleSubmitWarehouseForm = async () => {
    const trimmedName = warehouseNameInput.trim();
    if (!trimmedName) {
      setWarehouseFormError(t("inventory.validation.warehouseNameRequired"));
      return;
    }
    const farmId = warehouseDialogMode === "create" ? warehouseFarmIdInput : selectedWarehouse?.farmId;
    if (!farmId) {
      setWarehouseFormError(t("inventory.validation.farmRequired"));
      return;
    }
    setWarehouseFormError("");
    try {
      if (warehouseDialogMode === "create") {
        await createWarehouseMutation.mutateAsync({ name: trimmedName, farmId, type: "INPUT" });
        toast.success(t("inventory.toast.warehouseCreateSuccess"));
      } else if (warehouseDialogMode === "edit" && selectedWarehouse) {
        await updateWarehouseMutation.mutateAsync({ id: selectedWarehouse.id, data: { name: trimmedName, farmId } });
        toast.success(t("inventory.toast.warehouseUpdateSuccess"));
      }
      closeWarehouseFormModal();
    } catch (error) {
      setWarehouseFormError(error instanceof Error ? error.message : t("inventory.toast.warehouseSaveError"));
    }
  };

  const confirmDeleteWarehouse = async () => {
    if (!selectedWarehouseId) return;
    try {
      await deleteWarehouseMutation.mutateAsync(selectedWarehouseId);
      toast.success(t("inventory.toast.warehouseDeleteSuccess"));
      setShowDeleteWarehouseModal(false);
      setSelectedWarehouseId(undefined);
      setSelectedLocationId(undefined);
      setPage(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inventory.toast.warehouseDeleteError"));
    }
  };

  // ===== STOCK OUT / ADJUST HANDLERS =====
  const handleStockOut = (row: OnHandRow) => {
    setStockOutRow(row);
    setShowStockOutModal(true);
  };

  const handleAdjust = (row: OnHandRow) => {
    setAdjustRow(row);
    setShowAdjustModal(true);
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(preferences.locale);
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(preferences.locale);
    } catch {
      return dateStr;
    }
  };

  // ===== PAGINATION DATA =====
  const isInventoryTab = activeTab === "on-hand" || activeTab === "movements";
  const currentSupplierData =
    activeTab === "suppliers" ? suppliersData
    : activeTab === "items" ? itemsData
    : activeTab === "lots" ? lotsData
    : null;

  // ===== RENDER =====
  return (
    <PageContainer variant="wide">
      <div className="farmer-supply-management-page">
        <div className="supplies-page">
        <div className="mb-6">
          <PageHeader
            icon={<Package className="w-8 h-8" />}
            title={t("suppliers.title")}
            subtitle={t("suppliers.subtitle")}
            actions={
              <Button onClick={() => setShowStockInModal(true)} variant="default" className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
                <Plus className="w-4 h-4 mr-2" />
                {t("common.stockIn")}
              </Button>
            }
          />
        </div>

        {/* ===== WAREHOUSE CONTROLS (only for inventory tabs) ===== */}
        {isInventoryTab && (
          <Card variant="filter" className="mb-6">
            <CardContent className="px-6 py-4">
              <div className="inventory-controls flex flex-wrap items-center justify-start gap-4">
                <div className="control-group">
                  <label htmlFor="warehouse-select">{t("inventory.warehouse")}</label>
                  <select
                    id="warehouse-select"
                    value={selectedWarehouseId || ""}
                    onChange={(e) => handleWarehouseChange(Number(e.target.value))}
                    disabled={loadingWarehouses}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    {loadingWarehouses && <option>{t("inventory.loading")}</option>}
                    {!loadingWarehouses && supplyWarehouses.length === 0 && (
                      <option value="">{t("inventory.noWarehouses")}</option>
                    )}
                    {supplyWarehouses.map((w: WarehouseEntity) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.farmName ? `(${w.farmName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="inventory-warehouse-toolbar">
                  <Button type="button" variant="default" size="sm" onClick={openCreateWarehouseModal} className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
                    <Plus className="w-4 h-4" />
                    {t("inventory.actions.addWarehouse")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={openEditWarehouseModal} disabled={!selectedWarehouse} className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                    <Pencil className="w-4 h-4" />
                    {t("inventory.actions.editWarehouse")}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setShowDeleteWarehouseModal(true)} disabled={!selectedWarehouse} className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background">
                    <Trash2 className="w-4 h-4" />
                    {t("inventory.actions.deleteWarehouse")}
                  </Button>
                </div>

                <div className="control-group">
                  <label htmlFor="location-select">{t("inventory.location")}</label>
                  <select
                    id="location-select"
                    value={selectedLocationId || ""}
                    onChange={(e) => setSelectedLocationId(e.target.value ? Number(e.target.value) : undefined)}
                    className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    <option value="">{t("inventory.allLocations")}</option>
                    {locations?.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.label || t("inventory.locationFallback", { id: loc.id })}
                      </option>
                    ))}
                  </select>
                </div>

                {activeTab === "on-hand" && (
                  <div className="control-group control-group--search">
                    <label htmlFor="search-input">{t("common.search")}</label>
                    <input
                      id="search-input"
                      type="text"
                      placeholder={t("inventory.searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                    />
                  </div>
                )}

                {activeTab === "movements" && (
                  <>
                    <div className="control-group">
                      <label htmlFor="type-filter">{t("inventory.movementType")}</label>
                      <select id="type-filter" value={movementTypeFilter} onChange={(e) => setMovementTypeFilter(e.target.value)} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                        <option value="">{t("inventory.allTypes")}</option>
                        <option value="IN">{t("inventory.types.in")}</option>
                        <option value="OUT">{t("inventory.types.out")}</option>
                        <option value="ADJUST">{t("inventory.types.adjust")}</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label htmlFor="date-from">{t("common.from")}</label>
                      <input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
                    </div>
                    <div className="control-group">
                      <label htmlFor="date-to">{t("common.to")}</label>
                      <input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== SUPPLIER FILTERS (only for supplier tabs) ===== */}
        {!isInventoryTab && (
          <div className="supplies-toolbar">
            <div className="supplies-filters flex flex-wrap items-center justify-start gap-4">
              {activeTab === "suppliers" && (
                <>
                  <input
                    type="text"
                    placeholder={t("suppliers.searchSuppliers")}
                    value={suppliersSearch}
                    onChange={(e) => { setSuppliersSearch(e.target.value); setPage(0); }}
                    className="search-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  />
                  <Button onClick={handleAddSupplier} variant="outline" size="sm" className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t("suppliers.addSupplier")}
                  </Button>
                </>
              )}

              {activeTab === "items" && (
                <>
                  <input
                    type="text"
                    placeholder={t("suppliers.searchSupplies")}
                    value={itemsSearch}
                    onChange={(e) => { setItemsSearch(e.target.value); setPage(0); }}
                    className="search-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  />
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={itemsRestrictedFilter === true}
                      onChange={(e) => { setItemsRestrictedFilter(e.target.checked ? true : undefined); setPage(0); }}
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded border-input"
                    />
                    {t("suppliers.filters.restrictedOnly")}
                  </label>
                  <Button onClick={handleAddItem} variant="outline" size="sm" className="min-h-[44px] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("suppliers.addItem")}
                  </Button>
                </>
              )}

              {activeTab === "lots" && (
                <>
                  <input
                    type="text"
                    placeholder={t("suppliers.lots.searchPlaceholder")}
                    value={lotsSearch}
                    onChange={(e) => { setLotsSearch(e.target.value); setPage(0); }}
                    className="search-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  />
                  <select
                    value={lotsItemFilter || ""}
                    onChange={(e) => { setLotsItemFilter(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
                    className="filter-select"
                  >
                    <option value="">{t("suppliers.filters.all")} {t("suppliers.tabs.items")}</option>
                    {allItems?.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <select
                    value={lotsSupplierFilter || ""}
                    onChange={(e) => { setLotsSupplierFilter(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
                    className="filter-select focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    <option value="">{t("suppliers.filters.all")} {t("suppliers.tabs.suppliers")}</option>
                    {allSuppliers?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="supply-management-tabs">
          <button className={`tab ${activeTab === "on-hand" ? "active" : ""}`} onClick={() => handleTabChange("on-hand")}>
            {t("inventory.tabs.onHand")}
          </button>
          <button className={`tab ${activeTab === "lots" ? "active" : ""}`} onClick={() => handleTabChange("lots")}>
            {t("suppliers.tabs.lots")}
          </button>
          <button className={`tab ${activeTab === "movements" ? "active" : ""}`} onClick={() => handleTabChange("movements")}>
            {t("inventory.tabs.movements")}
          </button>
          <button className={`tab ${activeTab === "items" ? "active" : ""}`} onClick={() => handleTabChange("items")}>
            {t("suppliers.tabs.items")}
          </button>
          <button className={`tab ${activeTab === "suppliers" ? "active" : ""}`} onClick={() => handleTabChange("suppliers")}>
            {t("suppliers.tabs.suppliers")}
          </button>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="supply-management-content">
          {activeTab === "suppliers" && (
            <SuppliersTable
              data={suppliersData?.items || []}
              loading={loadingSuppliers}
              onEdit={handleEditSupplier}
              onDelete={handleDeleteSupplier}
            />
          )}
          {activeTab === "items" && (
            <SupplyItemsTable
              data={itemsData?.items || []}
              loading={loadingItems}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          )}
          {activeTab === "lots" && (
            <SupplyLotsTable data={lotsData?.items || []} loading={loadingLots} />
          )}

          {activeTab === "on-hand" && (
            <>
              {!selectedWarehouseId && (
                <div className="empty-state"><p>{t("inventory.selectWarehouse")}</p></div>
              )}
              {selectedWarehouseId && (
                <OnHandTable
                  data={onHandData?.items || []}
                  loading={loadingOnHand}
                  onStockOut={handleStockOut}
                  onAdjust={handleAdjust}
                  formatDate={formatDate}
                />
              )}
            </>
          )}

          {activeTab === "movements" && (
            <>
              {!selectedWarehouseId && (
                <div className="empty-state"><p>{t("inventory.selectWarehouse")}</p></div>
              )}
              {selectedWarehouseId && (
                <MovementsTable
                  data={movementsData?.items || []}
                  loading={loadingMovements}
                  formatDateTime={formatDateTime}
                />
              )}
            </>
          )}

          {/* Pagination */}
          {!isInventoryTab && currentSupplierData && (
            <div className="pagination">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {t("common.previous")}
              </button>
              <span>
                {t("suppliers.pagination.summary", {
                  page: page + 1,
                  totalPages: currentSupplierData.totalPages || 1,
                })}
              </span>
              <button disabled={page >= currentSupplierData.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                {t("common.next")}
              </button>
            </div>
          )}

          {isInventoryTab && selectedWarehouseId && (
            <div className="pagination">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {t("common.previous")}
              </button>
              <span>{t("pagination.page")} {page + 1}</span>
              <button
                disabled={
                  activeTab === "on-hand"
                    ? !onHandData || page >= onHandData.totalPages - 1
                    : !movementsData || page >= movementsData.totalPages - 1
                }
                onClick={() => setPage((p) => p + 1)}
              >
                {t("common.next")}
              </button>
            </div>
          )}
        </div>

        {/* ===== MODALS ===== */}
        {showStockInModal && (
          <StockInModal
            onClose={() => setShowStockInModal(false)}
            onSuccess={() => setShowStockInModal(false)}
            onSubmit={stockInMutation.mutateAsync}
            isPending={stockInMutation.isPending}
            defaultWarehouseId={selectedWarehouseId}
          />
        )}

        <SupplierFormDialog
          open={showSupplierFormDialog}
          onOpenChange={setShowSupplierFormDialog}
          supplier={supplierToEdit}
          onSubmit={handleSupplierFormSubmit}
          isPending={createSupplierMutation.isPending || updateSupplierMutation.isPending}
        />

        <DeleteSupplierDialog
          open={showDeleteSupplierDialog}
          onOpenChange={setShowDeleteSupplierDialog}
          supplier={supplierToDelete}
          onConfirm={handleConfirmDeleteSupplier}
          isPending={deleteSupplierMutation.isPending}
        />

        <SupplyItemFormDialog
          open={showItemFormDialog}
          onOpenChange={setShowItemFormDialog}
          item={itemToEdit}
          onSubmit={handleItemFormSubmit}
          isPending={createSupplyItemMutation.isPending || updateSupplyItemMutation.isPending}
        />

        <DeleteSupplyItemDialog
          open={showDeleteItemDialog}
          onOpenChange={setShowDeleteItemDialog}
          item={itemToDelete}
          onConfirm={handleConfirmDeleteItem}
          isPending={deleteSupplyItemMutation.isPending}
        />

        {warehouseDialogMode && (
          <WarehouseFormModal
            mode={warehouseDialogMode}
            name={warehouseNameInput}
            farmId={warehouseFarmIdInput}
            farms={farmOptions.map((farm) => ({ id: farm.id, name: farm.name }))}
            onNameChange={setWarehouseNameInput}
            onFarmIdChange={setWarehouseFarmIdInput}
            onClose={closeWarehouseFormModal}
            onSubmit={handleSubmitWarehouseForm}
            isPending={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
            error={warehouseFormError}
          />
        )}

        {showDeleteWarehouseModal && selectedWarehouse && (
          <DeleteWarehouseModal
            warehouseName={selectedWarehouse.name}
            onClose={() => { if (!deleteWarehouseMutation.isPending) setShowDeleteWarehouseModal(false); }}
            onConfirm={confirmDeleteWarehouse}
            isPending={deleteWarehouseMutation.isPending}
          />
        )}

        {showStockOutModal && stockOutRow && (
          <StockOutModal
            row={stockOutRow}
            onClose={() => { setShowStockOutModal(false); setStockOutRow(null); }}
            onSubmit={async (data) => { await recordMovementMutation.mutateAsync(data); setShowStockOutModal(false); setStockOutRow(null); }}
            isPending={recordMovementMutation.isPending}
          />
        )}

        {showAdjustModal && adjustRow && (
          <AdjustModal
            row={adjustRow}
            onClose={() => { setShowAdjustModal(false); setAdjustRow(null); }}
            onSubmit={async (data) => { await recordMovementMutation.mutateAsync(data); setShowAdjustModal(false); setAdjustRow(null); }}
            isPending={recordMovementMutation.isPending}
          />
        )}
        </div>
      </div>
    </PageContainer>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUPPLIERS TABLE
// ═══════════════════════════════════════════════════════════════

interface SuppliersTableProps {
  data: Supplier[];
  loading: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

function SuppliersTable({ data, loading, onEdit, onDelete }: SuppliersTableProps) {
  const { t } = useSupplyManagementI18n();
  if (loading) return <div className="loading-state">{t("suppliers.loading")}</div>;
  if (data.length === 0) return <div className="empty-state">{t("suppliers.empty")}</div>;

  return (
    <div className="table-container">
      <table className="supplies-table">
        <thead>
          <tr>
            <th>{t("suppliers.table.name")}</th>
            <th className="numeric-cell">{t("suppliers.table.licenseNo")}</th>
            <th className="numeric-cell">{t("suppliers.table.phone")}</th>
            <th>{t("suppliers.table.email")}</th>
            <th className="actions-cell">{t("suppliers.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((supplier) => (
            <tr key={supplier.id}>
              <td className="name-cell">{supplier.name}</td>
              <td className="numeric-cell">{supplier.licenseNo || "-"}</td>
              <td className="numeric-cell">{supplier.contactPhone || "-"}</td>
              <td>{supplier.contactEmail || "-"}</td>
              <td className="actions-cell">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="action-btn" title={t("suppliers.actions.menu")}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(supplier)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      {t("suppliers.actions.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(supplier)} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("suppliers.actions.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUPPLY ITEMS TABLE
// ═══════════════════════════════════════════════════════════════

interface SupplyItemsTableProps {
  data: SupplyItem[];
  loading: boolean;
  onEdit: (item: SupplyItem) => void;
  onDelete: (item: SupplyItem) => void;
}

function SupplyItemsTable({ data, loading, onEdit, onDelete }: SupplyItemsTableProps) {
  const { t } = useSupplyManagementI18n();
  if (loading) return <div className="loading-state">{t("suppliers.loadingItems")}</div>;
  if (data.length === 0) return <div className="empty-state">{t("suppliers.noItems")}</div>;

  return (
    <div className="table-container">
      <table className="supplies-table">
        <thead>
          <tr>
            <th>{t("suppliers.itemsTable.name")}</th>
            <th>{t("suppliers.itemsTable.activeIngredient")}</th>
            <th>{t("suppliers.itemsTable.unit")}</th>
            <th>{t("suppliers.itemsTable.restricted")}</th>
            <th>{t("suppliers.itemsTable.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td className="name-cell">{item.name}</td>
              <td>{item.activeIngredient || "-"}</td>
              <td>{item.unit || "-"}</td>
              <td>
                {item.restrictedFlag ? (
                  <span className="badge badge-restricted">{t("suppliers.itemsTable.restrictedBadge")}</span>
                ) : (
                  <span className="badge badge-normal">{t("suppliers.itemsTable.normalBadge")}</span>
                )}
              </td>
              <td className="actions-cell">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="action-btn" title={t("suppliers.actions.menu")}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      {t("suppliers.actions.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("suppliers.actions.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUPPLY LOTS TABLE
// ═══════════════════════════════════════════════════════════════

function SupplyLotsTable({ data, loading }: { data: SupplyLot[]; loading: boolean }) {
  const { t, locale } = useSupplyManagementI18n();
  if (loading) return <div className="loading-state">{t("suppliers.loadingLots")}</div>;
  if (data.length === 0) return <div className="empty-state">{t("suppliers.noLots")}</div>;

  const fmtDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try { return new Date(dateStr).toLocaleDateString(locale); } catch { return dateStr; }
  };

  const isExpiringSoon = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    try {
      const diffDays = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    } catch { return false; }
  };

  return (
    <div className="table-container">
      <table className="supplies-table">
        <thead>
          <tr>
            <th>{t("suppliers.lotsTable.batchCode")}</th>
            <th>{t("suppliers.lotsTable.item")}</th>
            <th>{t("suppliers.lotsTable.supplier")}</th>
            <th className="numeric-cell">{t("suppliers.lotsTable.expiryDate")}</th>
            <th>{t("suppliers.lotsTable.status")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((lot) => (
            <tr key={lot.id}>
              <td className="batch-cell">{lot.batchCode || "-"}</td>
              <td>
                {lot.supplyItemName || "-"}
                {lot.restrictedFlag && <span className="badge badge-restricted ml-2">R</span>}
              </td>
              <td>{lot.supplierName || "-"}</td>
              <td className={`numeric-cell${isExpiringSoon(lot.expiryDate) ? " expiring-soon" : ""}`}>
                {fmtDate(lot.expiryDate)}
                {isExpiringSoon(lot.expiryDate) && (
                  <span className="expiry-warning">{t("suppliers.lotsTable.expiringSoon")}</span>
                )}
              </td>
              <td>
                <span className={`status-badge ${lot.status?.toLowerCase() || ""}`}>
                  {lot.status || "-"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ON-HAND TABLE (from InventoryPage)
// ═══════════════════════════════════════════════════════════════

interface OnHandTableProps {
  data: OnHandRow[];
  loading: boolean;
  onStockOut: (row: OnHandRow) => void;
  onAdjust: (row: OnHandRow) => void;
  formatDate: (date: string | null | undefined) => string;
}

function OnHandTable({ data, loading, onStockOut, onAdjust, formatDate }: OnHandTableProps) {
  const { preferences } = usePreferences();
  const { t } = useSupplyManagementI18n();

  if (loading) return <div className="loading-state">{t("inventory.loading")}</div>;
  if (data.length === 0) return <div className="empty-state">{t("inventory.noStock")}</div>;

  return (
    <div className="table-container">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>{t("inventory.table.lotCode")}</th>
            <th>{t("inventory.table.item")}</th>
            <th>{t("inventory.table.unit")}</th>
            <th>{t("inventory.table.expiryDate")}</th>
            <th>{t("inventory.table.location")}</th>
            <th>{t("inventory.table.onHand")}</th>
            <th>{t("inventory.table.status")}</th>
            <th>{t("inventory.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const display = getDisplayQuantity(row.onHandQuantity, row.unit, preferences.weightUnit, preferences.locale);
            return (
              <tr key={`${row.supplyLotId}-${row.locationId || "any"}`}>
                <td>{row.batchCode || "-"}</td>
                <td>{row.supplyItemName || "-"}</td>
                <td>{display.unitLabel || "-"}</td>
                <td>{formatDate(row.expiryDate)}</td>
                <td>{getLocationDisplayLabel(row.locationLabel, t)}</td>
                <td className="quantity">{display.formatted}</td>
                <td>
                  {(() => {
                    const statusMeta = getLotStatusMeta(row.lotStatus, t);
                    return <span className={`status-badge ${statusMeta.className}`}>{statusMeta.label}</span>;
                  })()}
                </td>
                <td className="actions-cell">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="action-btn transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-label={t("inventory.actions.menu")} title={t("inventory.actions.menu")}>
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem variant="destructive" onClick={() => onStockOut(row)}>
                        {t("inventory.actions.stockOut")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAdjust(row)}>
                        {t("inventory.actions.adjust")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MOVEMENTS TABLE (from InventoryPage)
// ═══════════════════════════════════════════════════════════════

function MovementsTable({ data, loading, formatDateTime }: { data: StockMovement[]; loading: boolean; formatDateTime: (date: string | null | undefined) => string }) {
  const { preferences } = usePreferences();
  const { t } = useSupplyManagementI18n();

  if (loading) return <div className="loading-state">{t("inventory.loadingMovements")}</div>;
  if (data.length === 0) return <div className="empty-state">{t("inventory.noMovements")}</div>;

  return (
    <div className="table-container">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>{t("inventory.movementsTable.date")}</th>
            <th>{t("inventory.movementsTable.type")}</th>
            <th>{t("inventory.movementsTable.quantity")}</th>
            <th>{t("inventory.movementsTable.lotCode")}</th>
            <th>{t("inventory.movementsTable.item")}</th>
            <th>{t("inventory.movementsTable.location")}</th>
            <th>{t("inventory.movementsTable.season")}</th>
            <th>{t("inventory.movementsTable.task")}</th>
            <th>{t("inventory.movementsTable.note")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((mv) => {
            const display = getDisplayQuantity(mv.quantity, mv.unit, preferences.weightUnit, preferences.locale);
            const movementMeta = getMovementTypeMeta(mv.movementType, t);
            const unitSuffix = display.unitLabel ? ` ${display.unitLabel}` : "";
            return (
              <tr key={mv.id}>
                <td>{formatDateTime(mv.movementDate)}</td>
                <td><span className={`type-badge ${movementMeta.className}`}>{movementMeta.label}</span></td>
                <td className={`quantity ${movementMeta.className}`}>
                  {movementMeta.className === "movement-out" ? "-" : ""}{display.formatted}{unitSuffix}
                </td>
                <td>{mv.batchCode || "-"}</td>
                <td>{mv.supplyItemName || "-"}</td>
                <td>{getLocationDisplayLabel(mv.locationLabel, t)}</td>
                <td>{mv.seasonName || "-"}</td>
                <td>{mv.taskTitle || "-"}</td>
                <td className="note">{mv.note || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STOCK IN MODAL (from SuppliersSuppliesPage)
// ═══════════════════════════════════════════════════════════════

interface StockInModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (data: StockInRequest) => Promise<unknown>;
  isPending: boolean;
  defaultWarehouseId?: number;
}

function StockInModal({ onClose, onSuccess, onSubmit, isPending, defaultWarehouseId }: StockInModalProps) {
  const { t } = useSupplyManagementI18n();
  const [error, setError] = useState("");
  const [warehouseId, setWarehouseId] = useState<number | null>(defaultWarehouseId || null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplyItemId, setSupplyItemId] = useState<number | null>(null);
  const [confirmRestricted, setConfirmRestricted] = useState(false);
  const [batchCode, setBatchCode] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [confirmExpiry, setConfirmExpiry] = useState(false);

  const { data: siWarehouses } = useMyWarehouses("INPUT");
  const { data: siLocations } = useLocations(warehouseId ?? undefined);
  const { data: siSuppliers } = useAllSuppliers();
  const { data: siItems } = useAllSupplyItems();

  const selectedItem = siItems?.find((i) => i.id === supplyItemId);
  const isRestricted = selectedItem?.restrictedFlag === true;
  const isExpiryPast = expiryDate ? new Date(expiryDate) <= new Date() : false;

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const warehouseErrorId = useId();
  const supplierErrorId = useId();
  const itemErrorId = useId();
  const quantityErrorId = useId();
  const isDirty =
    warehouseId !== (defaultWarehouseId || null) ||
    locationId !== null ||
    supplierId !== null ||
    supplyItemId !== null ||
    confirmRestricted ||
    batchCode.trim().length > 0 ||
    expiryDate.length > 0 ||
    quantity !== "" ||
    note.trim().length > 0 ||
    confirmExpiry;
  const closeWithConfirm = () => {
    if (isPending) return;
    if (isDirty && !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!warehouseId) newErrors.warehouse = t("suppliers.validation.required");
    if (!supplierId) newErrors.supplier = t("suppliers.validation.required");
    if (!supplyItemId) newErrors.item = t("suppliers.validation.required");
    if (quantity === "" || quantity <= 0) newErrors.quantity = t("suppliers.validation.invalidQuantity");
    
    if (isRestricted && !confirmRestricted) {
      setError(t("suppliers.validation.confirmRestricted"));
      return;
    }
    if (isExpiryPast && !confirmExpiry) {
      setError(t("suppliers.validation.confirmExpiry"));
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
    setError("");

    try {
      await onSubmit({ 
        warehouseId: warehouseId!, 
        locationId: locationId || undefined, 
        supplierId: supplierId!, 
        supplyItemId: supplyItemId!, 
        batchCode: batchCode || undefined, 
        expiryDate: expiryDate || undefined, 
        quantity: Number(quantity), 
        confirmRestricted: confirmRestricted || undefined, 
        note: note || undefined 
      });
      onSuccess();
    } catch (e) { 
      setError(e instanceof Error ? e.message : t("suppliers.stockIn.errors.recordFailed")); 
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && closeWithConfirm()}>
      <DialogContent className="sm:max-w-[600px]" closeDisabled={isPending}>
        <DialogHeader>
          <BackButton onClick={closeWithConfirm} className="w-fit" />
          <DialogTitle>{t("suppliers.stockIn.title")}</DialogTitle>
          <DialogDescription>{t("suppliers.stockIn.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-1 space-y-4">
            {error && <p id="stock-in-error" role="alert" className="text-sm text-destructive">{error}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">
                  {t("suppliers.stockIn.form.warehouse")} <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={warehouseId?.toString() || ""} 
                  onValueChange={(val) => { setWarehouseId(Number(val)); setLocationId(null); setFieldErrors(prev => ({...prev, warehouse: ""})); }}
                  disabled={isPending}
                >
                  <SelectTrigger id="warehouse" aria-invalid={!!fieldErrors.warehouse} aria-describedby={fieldErrors.warehouse ? warehouseErrorId : undefined} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                    <SelectValue placeholder={t("suppliers.stockIn.form.selectWarehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {siWarehouses?.map((w: WarehouseEntity) => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name} {w.farmName ? `(${w.farmName})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.warehouse && <p id={warehouseErrorId} className="text-sm text-destructive">{fieldErrors.warehouse}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t("suppliers.stockIn.form.locationOptional")}</Label>
                <Select 
                  value={locationId?.toString() || "any"} 
                  onValueChange={(val) => setLocationId(val === "any" ? null : Number(val))} 
                  disabled={!warehouseId || isPending}
                >
                  <SelectTrigger id="location" className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                    <SelectValue placeholder={t("suppliers.stockIn.form.anyLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t("suppliers.stockIn.form.anyLocation")}</SelectItem>
                    {siLocations?.map((loc: StockLocation) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>{loc.label || t("suppliers.stockIn.form.locationFallback", { id: loc.id })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">
                  {t("suppliers.stockIn.form.supplier")} <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={supplierId?.toString() || ""} 
                  onValueChange={(val) => { setSupplierId(Number(val)); setFieldErrors(prev => ({...prev, supplier: ""})); }}
                  disabled={isPending}
                >
                  <SelectTrigger id="supplier" aria-invalid={!!fieldErrors.supplier} aria-describedby={fieldErrors.supplier ? supplierErrorId : undefined} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                    <SelectValue placeholder={t("suppliers.stockIn.form.selectSupplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    {siSuppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.supplier && <p id={supplierErrorId} className="text-sm text-destructive">{fieldErrors.supplier}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplyItem">
                  {t("suppliers.stockIn.form.supplyItem")} <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={supplyItemId?.toString() || ""} 
                  onValueChange={(val) => { setSupplyItemId(Number(val)); setConfirmRestricted(false); setFieldErrors(prev => ({...prev, item: ""})); }}
                  disabled={isPending}
                >
                  <SelectTrigger id="supplyItem" aria-invalid={!!fieldErrors.item} aria-describedby={fieldErrors.item ? itemErrorId : undefined} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                    <SelectValue placeholder={t("suppliers.stockIn.form.selectItem")} />
                  </SelectTrigger>
                  <SelectContent>
                    {siItems?.map((i) => (
                      <SelectItem key={i.id} value={i.id.toString()}>{i.name} {i.unit ? `(${i.unit})` : ""} {i.restrictedFlag ? t("suppliers.stockIn.form.restrictedTag") : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.item && <p id={itemErrorId} className="text-sm text-destructive">{fieldErrors.item}</p>}
              </div>
            </div>

            {isRestricted && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                <strong className="text-sm text-amber-800 flex items-center">{t("suppliers.stockIn.form.restrictedTitle")}</strong>
                <p className="text-sm text-amber-700">{t("suppliers.stockIn.form.restrictedDescription")}</p>
                <label className="flex items-center space-x-2 text-sm text-amber-900 cursor-pointer">
                  <input type="checkbox" className="rounded border-amber-300 text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ring-offset-amber-50" checked={confirmRestricted} onChange={(e) => setConfirmRestricted(e.target.checked)} disabled={isPending} />
                  <span>{t("suppliers.stockIn.form.restrictedConfirm")}</span>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchCode">{t("suppliers.stockIn.form.batchCode")}</Label>
                <Input 
                  id="batchCode"
                  value={batchCode} 
                  onChange={(e) => setBatchCode(e.target.value)} 
                  placeholder={t("suppliers.stockIn.form.batchCodePlaceholder")} 
                  disabled={isPending}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">{t("suppliers.stockIn.form.expiryDate")}</Label>
                <Input 
                  id="expiryDate"
                  type="date" 
                  value={expiryDate} 
                  onChange={(e) => { setExpiryDate(e.target.value); setConfirmExpiry(false); }} 
                  disabled={isPending}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                />
              </div>
            </div>

            {isExpiryPast && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                <strong className="text-sm text-amber-800">{t("suppliers.stockIn.form.pastExpiryTitle")}</strong>
                <label className="flex items-center space-x-2 text-sm text-amber-900 cursor-pointer">
                  <input type="checkbox" className="rounded border-amber-300 text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ring-offset-amber-50" checked={confirmExpiry} onChange={(e) => setConfirmExpiry(e.target.checked)} disabled={isPending} />
                  <span>{t("suppliers.stockIn.form.pastExpiryConfirm")}</span>
                </label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="quantity">
                {t("suppliers.stockIn.form.quantity")} {selectedItem?.unit ? `(${selectedItem.unit})` : ""} <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="quantity"
                type="number" 
                min={0} 
                step="0.001" 
                value={quantity} 
                onChange={(e) => { setQuantity(e.target.value === "" ? "" : Number(e.target.value)); setFieldErrors(prev => ({...prev, quantity: ""})); }} 
                placeholder={t("suppliers.stockIn.form.quantityPlaceholder")} 
                disabled={isPending}
                aria-invalid={!!fieldErrors.quantity} 
                aria-describedby={fieldErrors.quantity ? quantityErrorId : undefined}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              />
              {fieldErrors.quantity && <p id={quantityErrorId} className="text-sm text-destructive">{fieldErrors.quantity}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{t("suppliers.stockIn.form.noteOptional")}</Label>
              <Textarea 
                id="note"
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder={t("suppliers.stockIn.form.notePlaceholder")} 
                disabled={isPending}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeWithConfirm} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
              {isPending ? t("common.processing") : t("suppliers.stockIn.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// STOCK OUT MODAL (from InventoryPage)
// ═══════════════════════════════════════════════════════════════

function StockOutModal({ row, onClose, onSubmit, isPending }: { row: OnHandRow; onClose: () => void; onSubmit: (data: StockMovementRequest) => Promise<void>; isPending: boolean }) {
  const { preferences } = usePreferences();
  const { t } = useSupplyManagementI18n();
  const [quantity, setQuantity] = useState<number>(0);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const display = getDisplayQuantity(row.onHandQuantity, row.unit, preferences.weightUnit, preferences.locale);
  const maxDisplayQuantity = display.displayValue;
  const unitSuffix = display.unitLabel ? ` ${display.unitLabel}` : "";
  const rowWeightUnit = normalizeWeightUnit(row.unit);

  const handleSubmit = async () => {
    if (!seasonId) { setError(t("inventory.validation.seasonRequired")); return; }
    if (quantity <= 0) { setError(t("inventory.validation.quantityPositive")); return; }
    if (quantity > maxDisplayQuantity) { setError(t("inventory.validation.quantityExceeds")); return; }
    setError("");
    try {
      const quantityToSend = rowWeightUnit ? toRowUnitQuantity(quantity, rowWeightUnit, preferences.weightUnit) : quantity;
      await onSubmit({ movementType: "OUT", supplyLotId: row.supplyLotId, warehouseId: row.warehouseId, locationId: row.locationId, quantity: quantityToSend, seasonId, note: note || undefined });
    } catch (e) { setError(e instanceof Error ? e.message : t("inventory.validation.movementFailed")); }
  };
  const isDirty = seasonId !== null || quantity !== 0 || note.trim().length > 0;
  const closeWithConfirm = () => {
    if (isPending) return;
    if (isDirty && !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))) return;
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && closeWithConfirm()}>
      <DialogContent className="sm:max-w-[500px]" closeDisabled={isPending}>
        <DialogHeader>
          <BackButton onClick={closeWithConfirm} className="w-fit" />
          <DialogTitle>{t("inventory.stockOut")}</DialogTitle>
          <DialogDescription>
            {row.supplyItemName} ({row.batchCode}) - {t("inventory.currentOnHand")}: {display.formatted}{unitSuffix}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          {error && (
            <p id="stock-out-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="stock-out-season" required>{t("inventory.seasonRequired")}</Label>
            <Input
              id="stock-out-season"
              type="number"
              placeholder={t("inventory.enterSeasonId")}
              value={seasonId || ""}
              onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : null)}
              aria-invalid={!!error}
              aria-describedby={error ? "stock-out-error" : undefined}
              disabled={isPending}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-out-quantity" required>
              {t("inventory.quantity")}{display.unitLabel ? ` (${display.unitLabel})` : ""}
            </Label>
            <Input
              id="stock-out-quantity"
              type="number"
              min={0}
              max={maxDisplayQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              aria-invalid={!!error}
              aria-describedby={error ? "stock-out-error" : undefined}
              disabled={isPending}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-out-note">{t("inventory.noteOptional")}</Label>
            <Textarea
              id="stock-out-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("inventory.addNote")}
              disabled={isPending}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeWithConfirm} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
              {isPending ? t("common.processing") : t("inventory.confirmStockOut")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADJUST MODAL (from InventoryPage)
// ═══════════════════════════════════════════════════════════════

function AdjustModal({ row, onClose, onSubmit, isPending }: { row: OnHandRow; onClose: () => void; onSubmit: (data: StockMovementRequest) => Promise<void>; isPending: boolean }) {
  const { preferences } = usePreferences();
  const { t } = useSupplyManagementI18n();
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const display = getDisplayQuantity(row.onHandQuantity, row.unit, preferences.weightUnit, preferences.locale);
  const baseDisplayQuantity = display.displayValue;
  const unitSuffix = display.unitLabel ? ` ${display.unitLabel}` : "";
  const rowWeightUnit = normalizeWeightUnit(row.unit);
  const newOnHand = baseDisplayQuantity + adjustQuantity;

  const handleSubmit = async () => {
    if (!note.trim()) { setError(t("inventory.validation.noteRequired")); return; }
    if (adjustQuantity === 0) { setError(t("inventory.validation.adjustNotZero")); return; }
    if (newOnHand < 0) { setError(t("inventory.validation.negativeOnHand")); return; }
    setError("");
    try {
      const quantityToSend = rowWeightUnit ? toRowUnitQuantity(adjustQuantity, rowWeightUnit, preferences.weightUnit) : adjustQuantity;
      await onSubmit({ movementType: "ADJUST", supplyLotId: row.supplyLotId, warehouseId: row.warehouseId, locationId: row.locationId, quantity: quantityToSend, note });
    } catch (e) { setError(e instanceof Error ? e.message : t("inventory.validation.adjustFailed")); }
  };
  const isDirty = adjustQuantity !== 0 || note.trim().length > 0;
  const closeWithConfirm = () => {
    if (isPending) return;
    if (isDirty && !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))) return;
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && closeWithConfirm()}>
      <DialogContent className="sm:max-w-[500px]" closeDisabled={isPending}>
        <DialogHeader>
          <BackButton onClick={closeWithConfirm} className="w-fit" />
          <DialogTitle>{t("inventory.adjustStock")}</DialogTitle>
          <DialogDescription>
            {row.supplyItemName} ({row.batchCode}) - {t("inventory.currentOnHand")}: {display.formatted}{unitSuffix}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          {error && (
            <p id="adjust-stock-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="adjust-stock-quantity" required>
              {t("inventory.adjustmentAmount")}{display.unitLabel ? ` (${display.unitLabel})` : ""}
            </Label>
            <Input
              id="adjust-stock-quantity"
              type="number"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(Number(e.target.value))}
              placeholder={t("inventory.adjustPlaceholder")}
              aria-invalid={!!error}
              aria-describedby={error ? "adjust-stock-error adjust-stock-preview" : "adjust-stock-preview"}
              disabled={isPending}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            />
            <p id="adjust-stock-preview" className="text-xs text-muted-foreground">
              {t("inventory.newOnHand")}:{" "}
              <strong className={newOnHand < 0 ? "text-destructive" : ""}>
                {formatNumber(newOnHand, preferences.locale, preferences.weightUnit === "G" ? 0 : 2)}{unitSuffix}
              </strong>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-stock-note" required>{t("inventory.noteRequired")}</Label>
            <Textarea
              id="adjust-stock-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("inventory.adjustReason")}
              aria-invalid={!!error}
              aria-describedby={error ? "adjust-stock-error" : undefined}
              disabled={isPending}
              required
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !note.trim()} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
              {isPending ? t("common.processing") : t("inventory.confirmAdjust")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// WAREHOUSE FORM MODAL (from InventoryPage)
// ═══════════════════════════════════════════════════════════════

interface WarehouseFormModalProps {
  mode: WarehouseDialogMode;
  name: string;
  farmId: number | undefined;
  farms: Array<{ id: number; name: string }>;
  onNameChange: (value: string) => void;
  onFarmIdChange: (value: number | undefined) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  error: string;
}

function WarehouseFormModal({ mode, name, farmId, farms, onNameChange, onFarmIdChange, onClose, onSubmit, isPending, error }: WarehouseFormModalProps) {
  const { t } = useSupplyManagementI18n();
  const isDirty = name.trim().length > 0 || farmId !== undefined;
  const closeWithConfirm = () => {
    if (isPending) return;
    if (isDirty && !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))) return;
    onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && closeWithConfirm()}>
      <DialogContent className="sm:max-w-[500px]" closeDisabled={isPending}>
        <DialogHeader>
          <BackButton onClick={closeWithConfirm} className="w-fit" />
          <DialogTitle>
            {mode === "create" ? t("inventory.dialog.addWarehouseTitle") : t("inventory.dialog.editWarehouseTitle")}
          </DialogTitle>
          <DialogDescription>{t("inventory.dialog.warehouseHint")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {error && (
            <p id="inventory-warehouse-form-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="inventory-warehouse-name" required>
              {t("inventory.form.warehouseNameLabel")}
            </Label>
            <Input
              id="inventory-warehouse-name"
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={t("inventory.form.warehouseNamePlaceholder")}
              maxLength={150}
              aria-invalid={!!error}
              aria-describedby={error ? "inventory-warehouse-form-error" : undefined}
              disabled={isPending}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inventory-warehouse-farm" required>
              {t("inventory.form.farmLabel")}
            </Label>
            <Select
              value={farmId ? String(farmId) : undefined}
              onValueChange={(value) => onFarmIdChange(Number(value))}
              disabled={mode === "edit" || isPending}
            >
              <SelectTrigger
                id="inventory-warehouse-farm"
                aria-invalid={!!error}
                aria-describedby={error ? "inventory-warehouse-form-error" : undefined}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              >
                <SelectValue placeholder={t("inventory.form.selectFarm")} />
              </SelectTrigger>
              <SelectContent>
                {farms.map((farm) => (
                  <SelectItem key={farm.id} value={String(farm.id)}>
                    {farm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeWithConfirm} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
              {isPending ? t("common.processing") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// DELETE WAREHOUSE MODAL (from InventoryPage)
// ═══════════════════════════════════════════════════════════════

function DeleteWarehouseModal({ warehouseName, onClose, onConfirm, isPending }: { warehouseName: string; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  const { t } = useSupplyManagementI18n();
  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-[500px]" closeDisabled={isPending}>
        <DialogHeader>
          <DialogTitle>{t("inventory.dialog.deleteWarehouseTitle")}</DialogTitle>
          <DialogDescription>
            {t("inventory.dialog.deleteWarehouseDescription", { warehouseName })}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("inventory.dialog.deleteWarehouseHint")}</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background">
            {isPending ? t("common.processing") : t("inventory.actions.deleteWarehouse")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUPPLIER FORM DIALOG (from SuppliersSuppliesPage)
// ═══════════════════════════════════════════════════════════════

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSubmit: (data: CreateSupplierRequest) => Promise<void>;
  isPending: boolean;
}

function SupplierFormDialog({ open, onOpenChange, supplier, onSubmit, isPending }: SupplierFormDialogProps) {
  const { t } = useSupplyManagementI18n();
  const [name, setName] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    if (supplier) { setName(supplier.name || ""); setLicenseNo(supplier.licenseNo || ""); setContactEmail(supplier.contactEmail || ""); setContactPhone(supplier.contactPhone || ""); }
    else { setName(""); setLicenseNo(""); setContactEmail(""); setContactPhone(""); }
    setError("");
  };

  if (open && name === "" && supplier) resetForm();
  const isDirty =
    name !== (supplier?.name || "") ||
    licenseNo !== (supplier?.licenseNo || "") ||
    contactEmail !== (supplier?.contactEmail || "") ||
    contactPhone !== (supplier?.contactPhone || "");
  const closeWithConfirm = () => {
    if (isPending) return;
    if (isDirty && !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))) return;
    setName("");
    setLicenseNo("");
    setContactEmail("");
    setContactPhone("");
    setError("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isPending && !newOpen) return;
    if (!newOpen) {
      closeWithConfirm();
      return;
    }
    else if (supplier) resetForm();
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t("suppliers.errors.nameRequired")); return; }
    try {
      await onSubmit({ name: name.trim(), licenseNo: licenseNo.trim() || null, contactEmail: contactEmail.trim() || null, contactPhone: contactPhone.trim() || null });
      setName("");
      setLicenseNo("");
      setContactEmail("");
      setContactPhone("");
      setError("");
      onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : t("suppliers.errors.saveFailed")); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" closeDisabled={isPending}>
        <DialogHeader>
          <BackButton onClick={closeWithConfirm} className="w-fit" />
          <DialogTitle>{supplier ? t("suppliers.form.editTitle") : t("suppliers.form.addTitle")}</DialogTitle>
          <DialogDescription>{supplier ? t("suppliers.form.editDescription") : t("suppliers.form.addDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }} className="space-y-4">
          {error && <div id="supplier-form-error" role="alert" className="text-destructive text-sm">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="supplier-name" required>{t("suppliers.form.name")}</Label>
            <Input id="supplier-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("suppliers.form.namePlaceholder")} aria-invalid={!!error} aria-describedby={error ? "supplier-form-error" : undefined} disabled={isPending} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-license">{t("suppliers.form.licenseNo")}</Label>
            <Input id="supplier-license" type="text" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder={t("suppliers.form.licenseNoPlaceholder")} disabled={isPending} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-phone">{t("suppliers.form.phone")}</Label>
            <Input id="supplier-phone" type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={t("suppliers.form.phonePlaceholder")} disabled={isPending} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-email">{t("suppliers.form.email")}</Label>
            <Input id="supplier-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={t("suppliers.form.emailPlaceholder")} disabled={isPending} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeWithConfirm} disabled={isPending}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">{isPending ? t("common.saving") : supplier ? t("common.saveChanges") : t("suppliers.form.addButton")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// DELETE SUPPLIER DIALOG (from SuppliersSuppliesPage)
// ═══════════════════════════════════════════════════════════════

function DeleteSupplierDialog({ open, onOpenChange, supplier, onConfirm, isPending }: { open: boolean; onOpenChange: (open: boolean) => void; supplier: Supplier | null; onConfirm: () => Promise<void>; isPending: boolean }) {
  const { t } = useSupplyManagementI18n();
  const [error, setError] = useState("");

  const handleConfirm = async () => { try { await onConfirm(); } catch (e) { setError(e instanceof Error ? e.message : t("suppliers.errors.deleteFailed")); } };
  const handleOpenChange = (newOpen: boolean) => {
    if (isPending && !newOpen) return;
    if (!newOpen) setError("");
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" closeDisabled={isPending}>
        <DialogHeader>
          <DialogTitle>{t("suppliers.delete.title")}</DialogTitle>
          <DialogDescription>{t("suppliers.delete.description", { name: supplier?.name })}</DialogDescription>
        </DialogHeader>
        {error && <p id="delete-supplier-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background">{isPending ? t("common.deleting") : t("common.delete")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SupplyItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SupplyItem | null;
  onSubmit: (data: CreateSupplyItemRequest) => Promise<void>;
  isPending: boolean;
}

function SupplyItemFormDialog({ open, onOpenChange, item, onSubmit, isPending }: SupplyItemFormDialogProps) {
  const { t } = useSupplyManagementI18n();
  const [name, setName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [unit, setUnit] = useState("");
  const [restrictedFlag, setRestrictedFlag] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    if (item) {
      setName(item.name || "");
      setActiveIngredient(item.activeIngredient || "");
      setUnit(item.unit || "");
      setRestrictedFlag(Boolean(item.restrictedFlag));
    } else {
      setName("");
      setActiveIngredient("");
      setUnit("");
      setRestrictedFlag(false);
    }
    setError("");
  };

  if (open && name === "" && item) resetForm();
  const isDirty =
    name !== (item?.name || "") ||
    activeIngredient !== (item?.activeIngredient || "") ||
    unit !== (item?.unit || "") ||
    restrictedFlag !== Boolean(item?.restrictedFlag);
  const closeWithConfirm = () => {
    if (isPending) return;
    if (isDirty && !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))) return;
    setName("");
    setActiveIngredient("");
    setUnit("");
    setRestrictedFlag(false);
    setError("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isPending && !newOpen) return;
    if (!newOpen) {
      closeWithConfirm();
      return;
    } else if (item) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("suppliers.errors.itemNameRequired"));
      return;
    }
    if (!unit.trim()) {
      setError(t("suppliers.errors.itemUnitRequired"));
      return;
    }
    try {
      await onSubmit({
        name: name.trim(),
        activeIngredient: activeIngredient.trim() || null,
        unit: unit.trim(),
        restrictedFlag,
      });
      setName("");
      setActiveIngredient("");
      setUnit("");
      setRestrictedFlag(false);
      setError("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("suppliers.errors.itemSaveFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" closeDisabled={isPending}>
        <DialogHeader>
          <BackButton onClick={closeWithConfirm} className="w-fit" />
          <DialogTitle>{item ? t("suppliers.itemForm.editTitle") : t("suppliers.itemForm.addTitle")}</DialogTitle>
          <DialogDescription>{item ? t("suppliers.itemForm.editDescription") : t("suppliers.itemForm.addDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }} className="space-y-4">
          {error && <div id="supply-item-form-error" role="alert" className="text-destructive text-sm">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="supply-item-name" required>{t("suppliers.itemForm.name")}</Label>
            <Input id="supply-item-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("suppliers.itemForm.namePlaceholder")} aria-invalid={!!error} aria-describedby={error ? "supply-item-form-error" : undefined} disabled={isPending} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supply-item-active-ingredient">{t("suppliers.itemForm.activeIngredient")}</Label>
            <Input id="supply-item-active-ingredient" type="text" value={activeIngredient} onChange={(e) => setActiveIngredient(e.target.value)} placeholder={t("suppliers.itemForm.activeIngredientPlaceholder")} disabled={isPending} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supply-item-unit" required>{t("suppliers.itemForm.unit")}</Label>
            <Input id="supply-item-unit" type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("suppliers.itemForm.unitPlaceholder")} maxLength={20} disabled={isPending} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
          </div>
          <div className="space-y-2">
            <label className="filter-checkbox">
              <input type="checkbox" checked={restrictedFlag} onChange={(e) => setRestrictedFlag(e.target.checked)} disabled={isPending} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded border-input" />
              {t("suppliers.itemForm.restricted")}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeWithConfirm} disabled={isPending}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">{isPending ? t("common.saving") : item ? t("common.saveChanges") : t("suppliers.itemForm.addButton")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSupplyItemDialog({ open, onOpenChange, item, onConfirm, isPending }: { open: boolean; onOpenChange: (open: boolean) => void; item: SupplyItem | null; onConfirm: () => Promise<void>; isPending: boolean }) {
  const { t } = useSupplyManagementI18n();
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("suppliers.errors.itemDeleteFailed"));
    }
  };
  const handleOpenChange = (newOpen: boolean) => {
    if (isPending && !newOpen) return;
    if (!newOpen) setError("");
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" closeDisabled={isPending}>
        <DialogHeader>
          <DialogTitle>{t("suppliers.itemDelete.title")}</DialogTitle>
          <DialogDescription>{t("suppliers.itemDelete.description", { name: item?.name })}</DialogDescription>
        </DialogHeader>
        {error && <p id="delete-supply-item-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending} className="shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background">{isPending ? t("common.deleting") : t("common.delete")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupplyManagementPage;
