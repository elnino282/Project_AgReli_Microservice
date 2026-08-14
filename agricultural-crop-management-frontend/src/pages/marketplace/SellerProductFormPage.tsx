import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link as LinkIcon, Upload, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type {
  MarketplaceFarmerProductFormLotOption,
  MarketplaceFarmerProductUpsertRequest,
  MarketplaceProductStatus,
} from "@/shared/api";
import {
  BackButton,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/shared/ui";
import {
  useMarketplaceCreateFarmerProductMutation,
  useMarketplaceFarmerProductDetail,
  useMarketplaceFarmerProductFormOptions,
  useMarketplaceUpdateFarmerProductMutation,
  useMarketplaceUpdateFarmerProductStatusMutation,
  useMarketplaceUploadFarmerProductImageMutation,
} from "@/features/marketplace/hooks";
import { SellerMarketplaceTabs } from "@/features/marketplace/layout";
import { formatDate, formatVnd } from "@/features/marketplace/lib/format";
import { getNextSellerProductStatusAction } from "@/features/marketplace/lib/sellerProductStatus";

type ProductFormState = {
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  price: string;
  stockQuantity: string;
  shippingWeightKgPerUnit: string;
  perishable: boolean;
  requiresColdChain: boolean;
  imageUrl: string;
  selectedFarmId: string;
  selectedSeasonId: string;
  selectedLotId: string;
};

type ImageInputMode = "upload" | "url";
type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

const EMPTY_FORM: ProductFormState = {
  name: "",
  category: "",
  shortDescription: "",
  description: "",
  price: "",
  stockQuantity: "",
  shippingWeightKgPerUnit: "",
  perishable: false,
  requiresColdChain: false,
  imageUrl: "",
  selectedFarmId: "",
  selectedSeasonId: "",
  selectedLotId: "",
};

const FORM_INPUT_CLASS_NAME =
  "h-11 rounded-xl border border-input bg-input-background px-4 text-sm shadow-sm placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const FORM_SELECT_TRIGGER_CLASS_NAME =
  "h-11 rounded-xl border border-input bg-input-background px-4 text-sm shadow-sm data-[placeholder]:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const FORM_TEXTAREA_CLASS_NAME =
  "rounded-xl border border-input bg-input-background px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const PRODUCT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateProductImageFile(file: File, t: Translator): string | null {
  if (!PRODUCT_IMAGE_ALLOWED_TYPES.has(file.type)) {
    return t(
      "marketplaceSeller.productForm.validation.imageUnsupportedType",
      "Only JPG, PNG, or WEBP product images are supported.",
    );
  }

  if (file.size > PRODUCT_IMAGE_MAX_SIZE_BYTES) {
    return t("marketplaceSeller.productForm.validation.imageTooLarge", {
      size: "5 MB",
      defaultValue: "Product image must be {{size}} or smaller.",
    });
  }

  return null;
}

function nextStatusActionLabel(status: MarketplaceProductStatus, t: Translator): string {
  switch (status) {
    case "DRAFT":
      return t("marketplaceSeller.productForm.actions.submitForReview", "Submit for review");
    case "PENDING_REVIEW":
      return t("marketplaceSeller.productForm.actions.moveToDraft", "Move back to draft");
    case "ACTIVE":
      return t("marketplaceSeller.productForm.actions.hideProduct", "Hide product");
    case "INACTIVE":
      return t("marketplaceSeller.productForm.actions.showProduct", "Show product");
    case "PUBLISHED":
      return t("marketplaceSeller.productForm.actions.hideProduct", "Hide product");
    case "HIDDEN":
      return t("marketplaceSeller.productForm.actions.showProduct", "Show product");
    default:
      return t("marketplaceSeller.productForm.actions.updateStatus", "Update status");
  }
}

export function SellerProductFormPage() {
  const { t, locale } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const productId = Number(id ?? 0);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [imageInputMode, setImageInputMode] = useState<ImageInputMode>("upload");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formOptionsQuery = useMarketplaceFarmerProductFormOptions();
  const productQuery = useMarketplaceFarmerProductDetail(isEdit ? productId : undefined);
  const product = productQuery.data;

  const createMutation = useMarketplaceCreateFarmerProductMutation();
  const updateMutation = useMarketplaceUpdateFarmerProductMutation(productId);
  const statusMutation = useMarketplaceUpdateFarmerProductStatusMutation(productId);
  const uploadImageMutation = useMarketplaceUploadFarmerProductImageMutation();

  useEffect(() => {
    if (!isEdit) {
      setForm(EMPTY_FORM);
      setImageInputMode("upload");
      setSelectedImageFile(null);
      setSelectedImagePreview(null);
      return;
    }

    if (!product) {
      return;
    }

    setForm({
      name: product.name,
      category: product.category ?? "",
      shortDescription: product.shortDescription ?? "",
      description: product.description ?? "",
      price: String(product.price),
      stockQuantity: String(product.stockQuantity),
      shippingWeightKgPerUnit: String(product.shippingWeightKgPerUnit ?? ""),
      perishable: product.perishable ?? false,
      requiresColdChain: product.requiresColdChain ?? false,
      imageUrl: product.imageUrl ?? "",
      selectedFarmId: product.farmId ? String(product.farmId) : "",
      selectedSeasonId: product.seasonId ? String(product.seasonId) : "",
      selectedLotId: product.lotId ? String(product.lotId) : "",
    });
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
  }, [isEdit, product]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const currentProductLot = useMemo<MarketplaceFarmerProductFormLotOption | null>(() => {
    if (!isEdit || !product?.lotId) {
      return null;
    }

    const optionLots = formOptionsQuery.data?.lots ?? [];
    if (optionLots.some((lot) => lot.id === product.lotId)) {
      return null;
    }

    return {
      id: product.lotId,
      lotCode: product.traceabilityCode ?? `LOT-${product.lotId}`,
      farmId: product.farmId,
      farmName: product.farmName,
      seasonId: product.seasonId,
      seasonName: product.seasonName,
      availableQuantity: product.availableQuantity ?? 0,
      harvestedAt: null,
      unit: product.unit,
      productName: product.name,
      productVariant: null,
      linkedProductId: product.id,
      linkedProductStatus: product.status,
    };
  }, [formOptionsQuery.data?.lots, isEdit, product]);

  const selectableLots = useMemo(() => {
    const lots = (formOptionsQuery.data?.lots ?? []).filter(
      (lot) => lot.linkedProductId == null || lot.linkedProductId === productId,
    );

    if (!currentProductLot || lots.some((lot) => lot.id === currentProductLot.id)) {
      return lots;
    }

    return [...lots, currentProductLot];
  }, [currentProductLot, formOptionsQuery.data?.lots, productId]);

  const filteredSeasons = useMemo(() => {
    const seasons = formOptionsQuery.data?.seasons ?? [];
    if (!form.selectedFarmId) {
      return seasons;
    }
    return seasons.filter((season) => String(season.farmId ?? "") === form.selectedFarmId);
  }, [form.selectedFarmId, formOptionsQuery.data?.seasons]);

  const filteredLots = useMemo(() => {
    return selectableLots.filter((lot) => {
      const matchesFarm = !form.selectedFarmId || String(lot.farmId ?? "") === form.selectedFarmId;
      const matchesSeason =
        !form.selectedSeasonId || String(lot.seasonId ?? "") === form.selectedSeasonId;
      return matchesFarm && matchesSeason;
    });
  }, [form.selectedFarmId, form.selectedSeasonId, selectableLots]);

  const selectedLot = useMemo(
    () => selectableLots.find((lot) => String(lot.id) === form.selectedLotId),
    [form.selectedLotId, selectableLots],
  );

  const lotsAlreadyLinkedCount = useMemo(
    () =>
      (formOptionsQuery.data?.lots ?? []).filter(
        (lot) => lot.linkedProductId != null && lot.linkedProductId !== productId,
      ).length,
    [formOptionsQuery.data?.lots, productId],
  );

  const canSubmit =
    Boolean(form.name.trim()) &&
    Boolean(form.selectedLotId) &&
    Number(form.price) > 0 &&
    Number(form.stockQuantity) > 0 &&
    Number(form.shippingWeightKgPerUnit) > 0 &&
    Boolean(selectedLot) &&
    Number(form.stockQuantity) <= Number(selectedLot?.availableQuantity ?? 0);

  const selectedLotAvailableQuantity = Number(selectedLot?.availableQuantity ?? 0);
  const selectedLotIsApprovalBlocked = Boolean(selectedLot && selectedLotAvailableQuantity <= 0);
  const productModerationReason = product?.statusReason ?? product?.rejectionReason ?? null;
  const imagePreviewSrc = selectedImagePreview ?? form.imageUrl.trim();
  const isSavingProduct = createMutation.isPending || updateMutation.isPending || uploadImageMutation.isPending;
  const saveWillRequireReview = Boolean(
    isEdit &&
      product &&
      !["DRAFT", "PENDING_REVIEW"].includes(product.status),
  );
  const initialForm = useMemo<ProductFormState>(() => {
    if (!isEdit || !product) {
      return EMPTY_FORM;
    }

    return {
      name: product.name,
      category: product.category ?? "",
      shortDescription: product.shortDescription ?? "",
      description: product.description ?? "",
      price: String(product.price),
      stockQuantity: String(product.stockQuantity),
      shippingWeightKgPerUnit: String(product.shippingWeightKgPerUnit ?? ""),
      perishable: product.perishable ?? false,
      requiresColdChain: product.requiresColdChain ?? false,
      imageUrl: product.imageUrl ?? "",
      selectedFarmId: product.farmId ? String(product.farmId) : "",
      selectedSeasonId: product.seasonId ? String(product.seasonId) : "",
      selectedLotId: product.lotId ? String(product.lotId) : "",
    };
  }, [isEdit, product]);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm) || !!selectedImageFile;

  function updateForm(patch: Partial<ProductFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function clearSelectedImageFile() {
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationMessage = validateProductImageFile(file, t);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      clearSelectedImageFile();
      return;
    }

    setErrorMessage(null);
    setImageInputMode("upload");
    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  }

  function handleImageUrlChange(event: ChangeEvent<HTMLInputElement>) {
    clearSelectedImageFile();
    updateForm({ imageUrl: event.target.value });
  }

  function handleImageInputModeChange(value: string) {
    const mode = value as ImageInputMode;
    setImageInputMode(mode);
    if (mode === "url") {
      clearSelectedImageFile();
    }
  }

  function handleFarmChange(value: string) {
    updateForm({
      selectedFarmId: value,
      selectedSeasonId: "",
      selectedLotId: "",
      stockQuantity: "",
    });
  }

  function handleSeasonChange(value: string) {
    updateForm({
      selectedSeasonId: value,
      selectedLotId: "",
      stockQuantity: "",
    });
  }

  function handleLotChange(value: string) {
    const lot = selectableLots.find((candidate) => String(candidate.id) === value);
    if (!lot) {
      updateForm({ selectedLotId: "", stockQuantity: "" });
      return;
    }

    updateForm({
      selectedFarmId: lot.farmId ? String(lot.farmId) : "",
      selectedSeasonId: lot.seasonId ? String(lot.seasonId) : "",
      selectedLotId: String(lot.id),
      stockQuantity:
        form.selectedLotId === String(lot.id) && form.stockQuantity
          ? form.stockQuantity
          : String(lot.availableQuantity),
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!selectedLot) {
      setErrorMessage(
        t(
          "marketplaceSeller.productForm.validation.selectLot",
          "Choose a harvested lot before saving the listing.",
        ),
      );
      return;
    }

    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);
    const shippingWeightKgPerUnit = Number(form.shippingWeightKgPerUnit);

    if (!Number.isFinite(price) || price <= 0) {
      setErrorMessage(t("marketplaceSeller.productForm.validation.pricePositive", "Price must be greater than 0."));
      return;
    }

    if (!Number.isFinite(stockQuantity) || stockQuantity <= 0) {
      setErrorMessage(
        t("marketplaceSeller.productForm.validation.quantityPositive", "Quantity to sell must be greater than 0."),
      );
      return;
    }

    if (!Number.isFinite(shippingWeightKgPerUnit) || shippingWeightKgPerUnit <= 0) {
      setErrorMessage(t(
        "marketplaceSeller.productForm.validation.shippingWeightPositive",
        "Shipping weight per unit must be greater than 0 kg.",
      ));
      return;
    }

    if (stockQuantity > selectedLot.availableQuantity) {
      setErrorMessage(
        t("marketplaceSeller.productForm.validation.quantityExceed", {
          quantity: selectedLot.availableQuantity,
          unit: selectedLot.unit ?? "",
          defaultValue: "Quantity to sell cannot exceed {{quantity}} {{unit}} from the selected harvested lot.",
        }).trim(),
      );
      return;
    }

    try {
      let productImageUrl = form.imageUrl.trim() || undefined;
      if (selectedImageFile) {
        const uploadedImage = await uploadImageMutation.mutateAsync(selectedImageFile);
        productImageUrl = uploadedImage.url;
      }

      const payload: MarketplaceFarmerProductUpsertRequest = {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        shortDescription: form.shortDescription.trim() || undefined,
        description: form.description.trim() || undefined,
        price,
        stockQuantity,
        shippingWeightKgPerUnit,
        perishable: form.perishable,
        requiresColdChain: form.requiresColdChain,
        imageUrl: productImageUrl,
        lotId: Number(form.selectedLotId),
      };

      if (isEdit) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }

      navigate("/farmer/marketplace-products");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("marketplaceSeller.productForm.errors.save", "Failed to save product."));
    }
  }

  async function handleStatusTransition() {
    if (!product) {
      return;
    }

    const request = getNextSellerProductStatusAction(product.status);
    if (!request) {
      return;
    }

    setErrorMessage(null);
    try {
      await statusMutation.mutateAsync(request);
      navigate("/farmer/marketplace-products");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t("marketplaceSeller.productForm.errors.updateStatus", "Failed to update product status."),
      );
    }
  }

  const isLoading = formOptionsQuery.isLoading || (isEdit && productQuery.isLoading);
  const isError = formOptionsQuery.isError || (isEdit && productQuery.isError);
  const hasNoLots = !formOptionsQuery.isLoading && !formOptionsQuery.isError && selectableLots.length === 0;

  if (isLoading) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6 space-y-6">
        <SellerMarketplaceTabs />
        <Card className="border-dashed">
          <CardContent className="p-8 text-sm text-muted-foreground">
            {t("marketplaceSeller.productForm.loading", "Loading harvest-based seller workflow...")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6 space-y-6">
        <SellerMarketplaceTabs />
        <Card className="border-destructive/30">
          <CardContent className="space-y-4 p-8">
            <p className="text-sm text-destructive">
              {isEdit
                ? t(
                    "marketplaceSeller.productForm.errors.loadEdit",
                    "Failed to load the product detail or harvest options.",
                  )
                : t(
                    "marketplaceSeller.productForm.errors.loadCreate",
                    "Failed to load your harvest-based selling options.",
                  )}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void Promise.all([formOptionsQuery.refetch(), productQuery.refetch()])}
              >
                {t("marketplaceSeller.common.tryAgain", "Try again")}
              </Button>
              <BackButton to="/farmer/marketplace-products" variant="outline" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEdit && !product) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6 space-y-6">
        <SellerMarketplaceTabs />
        <Card>
          <CardContent className="space-y-4 p-8">
            <p className="text-sm text-muted-foreground">
              {t("marketplaceSeller.productForm.notFound", "This product could not be found for your account.")}
            </p>
            <BackButton to="/farmer/marketplace-products" variant="outline" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEdit && hasNoLots) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6 space-y-6">
        <SellerMarketplaceTabs />
        <Card>
          <CardContent className="space-y-4 p-8">
            <p className="text-sm text-foreground">
              {t(
                "marketplaceSeller.productForm.noLots.title",
                "You do not have any harvested lots with remaining quantity ready to sell yet.",
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                "marketplaceSeller.productForm.noLots.description",
                "Finish harvest intake first, then come back here to turn a harvested lot into a marketplace listing.",
              )}
            </p>
            <BackButton to="/farmer/marketplace-products" variant="outline" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto px-6 pt-6 space-y-6">
      <SellerMarketplaceTabs />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">
            {t("marketplaceSeller.common.brand", "Seller Portal")}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">
            {isEdit
              ? t("marketplaceSeller.productForm.header.editTitle", "Edit marketplace listing")
              : t("marketplaceSeller.productForm.header.createTitle", "Create marketplace listing")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t(
              "marketplaceSeller.productForm.header.subtitle",
              "Create a marketplace listing from harvested lots with full traceability and stock controls.",
            )}
          </p>
        </div>
        <BackButton
          to="/farmer/marketplace-products"
          confirmOnLeave={isDirty && !isSavingProduct}
          variant="outline"
        />
      </div>

      {saveWillRequireReview ? (
        <Card className="border-warning/40 bg-warning/10 shadow-sm">
          <CardContent className="p-4 text-sm text-foreground">
            {t(
              "marketplaceSeller.productForm.reapprovalWarning",
              "Lưu thay đổi sẽ gửi duyệt lại và tạm ẩn khỏi marketplace cho tới khi quản trị viên phê duyệt.",
            )}
          </CardContent>
        </Card>
      ) : null}

      <form
        className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]"
        onSubmit={onSubmit}
      >
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>{t("marketplaceSeller.productForm.sections.basicInfo", "Basic information")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-name">{t("marketplaceSeller.productForm.fields.name", "Listing name")} *</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(event) => updateForm({ name: event.target.value })}
                  placeholder={t(
                    "marketplaceSeller.productForm.placeholders.name",
                    "Example: Premium jasmine rice from harvest lot 2026",
                  )}
                  required
                  className={FORM_INPUT_CLASS_NAME}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-category">{t("marketplaceSeller.productForm.fields.category", "Category")}</Label>
                <Input
                  id="product-category"
                  value={form.category}
                  onChange={(event) => updateForm({ category: event.target.value })}
                  placeholder={t("marketplaceSeller.productForm.placeholders.category", "Grain, vegetable, fruit...")}
                  className={FORM_INPUT_CLASS_NAME}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-price">{t("marketplaceSeller.productForm.fields.price", "Price")} *</Label>
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price}
                  onChange={(event) => updateForm({ price: event.target.value })}
                  required
                  className={FORM_INPUT_CLASS_NAME}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-stock">
                  {t("marketplaceSeller.productForm.fields.quantityToSell", "Quantity to sell")} *
                  {selectedLot?.unit ? ` (${selectedLot.unit})` : ""}
                </Label>
                <Input
                  id="product-stock"
                  type="number"
                  min="0"
                  max={selectedLot?.availableQuantity}
                  step="0.001"
                  value={form.stockQuantity}
                  onChange={(event) => updateForm({ stockQuantity: event.target.value })}
                  required
                  className={FORM_INPUT_CLASS_NAME}
                />
                {selectedLot ? (
                  <p className="text-xs text-muted-foreground">
                    {t("marketplaceSeller.productForm.maxAllowed", {
                      quantity: selectedLot.availableQuantity,
                      unit: selectedLot.unit ?? "",
                      defaultValue: "Max allowed: {{quantity}} {{unit}}",
                    })}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-shipping-weight">
                  {t("marketplaceSeller.productForm.fields.shippingWeight", "Shipping weight per unit (kg)")} *
                </Label>
                <Input
                  id="product-shipping-weight"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.shippingWeightKgPerUnit}
                  onChange={(event) => updateForm({ shippingWeightKgPerUnit: event.target.value })}
                  required
                  className={FORM_INPUT_CLASS_NAME}
                />
                <p className="text-xs text-muted-foreground">
                  {t(
                    "marketplaceSeller.productForm.fields.shippingWeightHint",
                    "Used by delivery-service to issue an authoritative quote.",
                  )}
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border p-4">
                <label className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.perishable}
                    onChange={(event) => updateForm({ perishable: event.target.checked })}
                  />
                  {t("marketplaceSeller.productForm.fields.perishable", "Perishable product")}
                </label>
                <label className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.requiresColdChain}
                    onChange={(event) => updateForm({ requiresColdChain: event.target.checked })}
                  />
                  {t("marketplaceSeller.productForm.fields.requiresColdChain", "Requires cold chain")}
                </label>
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label>{t("marketplaceSeller.productForm.fields.productImage", "Product image")}</Label>
                <Tabs
                  value={imageInputMode}
                  onValueChange={handleImageInputModeChange}
                  className="gap-3"
                >
                  <TabsList className="w-full overflow-x-auto">
                    <TabsTrigger type="button" value="upload" className="gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {t("marketplaceSeller.productForm.imageInput.uploadTab", "Upload image")}
                    </TabsTrigger>
                    <TabsTrigger type="button" value="url" className="gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      {t("marketplaceSeller.productForm.imageInput.urlTab", "Use URL")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-3">
                    <Label
                      htmlFor="product-image-file"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Upload className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />
                      <span className="font-medium text-foreground">
                        {selectedImageFile?.name ??
                          t("marketplaceSeller.productForm.imageInput.chooseFile", "Choose product image")}
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {t("marketplaceSeller.productForm.imageInput.fileHint", "JPG, PNG, or WEBP up to 5 MB")}
                      </span>
                      <Input
                        id="product-image-file"
                        type="file"
                        accept={PRODUCT_IMAGE_ACCEPT}
                        aria-label={t("marketplaceSeller.productForm.imageInput.fileInputLabel", "Product image file")}
                        onChange={handleImageFileChange}
                        className="sr-only"
                      />
                    </Label>
                    {selectedImageFile ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearSelectedImageFile}
                        className="gap-2 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        {t("marketplaceSeller.productForm.imageInput.removeSelected", "Remove selected image")}
                      </Button>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="url" className="space-y-2">
                    <Label htmlFor="product-image-url">
                      {t("marketplaceSeller.productForm.fields.imageUrl", "Main image URL")}
                    </Label>
                    <Input
                      id="product-image-url"
                      value={form.imageUrl}
                      onChange={handleImageUrlChange}
                      placeholder="https://..."
                      className={FORM_INPUT_CLASS_NAME}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>{t("marketplaceSeller.productForm.sections.descriptions", "Descriptions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-short-desc">
                  {t("marketplaceSeller.productForm.fields.shortDescription", "Short description")}
                </Label>
                <Input
                  id="product-short-desc"
                  value={form.shortDescription}
                  onChange={(event) => updateForm({ shortDescription: event.target.value })}
                  placeholder={t(
                    "marketplaceSeller.productForm.placeholders.shortDescription",
                    "A short summary buyers can scan quickly",
                  )}
                  className={FORM_INPUT_CLASS_NAME}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-description">
                  {t("marketplaceSeller.productForm.fields.fullDescription", "Full description")}
                </Label>
                <Textarea
                  id="product-description"
                  value={form.description}
                  onChange={(event) => updateForm({ description: event.target.value })}
                  placeholder={t(
                    "marketplaceSeller.productForm.placeholders.fullDescription",
                    "Add packaging notes, harvest quality, shipping notes, or handling instructions",
                  )}
                  className={`${FORM_TEXTAREA_CLASS_NAME} min-h-36`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>{t("marketplaceSeller.productForm.sections.harvestSource", "Harvest source")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label id="product-farm-label">{t("marketplaceSeller.productForm.fields.farm", "Farm")}</Label>
                <Select value={form.selectedFarmId} onValueChange={handleFarmChange}>
                  <SelectTrigger aria-labelledby="product-farm-label" className={FORM_SELECT_TRIGGER_CLASS_NAME}>
                    <SelectValue placeholder={t("marketplaceSeller.productForm.placeholders.selectFarm", "Choose your farm")} />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptionsQuery.data?.farms.map((farm) => (
                      <SelectItem key={farm.id} value={String(farm.id)}>
                        {farm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label id="product-season-label">{t("marketplaceSeller.productForm.fields.season", "Season")}</Label>
                <Select
                  value={form.selectedSeasonId}
                  onValueChange={handleSeasonChange}
                  disabled={!form.selectedFarmId}
                >
                  <SelectTrigger aria-labelledby="product-season-label" className={FORM_SELECT_TRIGGER_CLASS_NAME}>
                    <SelectValue
                      placeholder={
                        form.selectedFarmId
                          ? t("marketplaceSeller.productForm.placeholders.selectSeason", "Choose a season")
                          : t("marketplaceSeller.productForm.placeholders.pickFarmFirst", "Pick a farm first")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSeasons.map((season) => (
                      <SelectItem key={season.id} value={String(season.id)}>
                        {season.seasonName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label id="product-lot-label">{t("marketplaceSeller.productForm.fields.harvestLot", "Harvested lot")}</Label>
                <Select
                  value={form.selectedLotId}
                  onValueChange={handleLotChange}
                  disabled={!form.selectedFarmId}
                >
                  <SelectTrigger aria-labelledby="product-lot-label" className={FORM_SELECT_TRIGGER_CLASS_NAME}>
                    <SelectValue
                      placeholder={
                        form.selectedFarmId
                          ? t("marketplaceSeller.productForm.placeholders.selectLot", "Choose a harvested lot")
                          : t("marketplaceSeller.productForm.placeholders.pickFarmFirst", "Pick a farm first")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLots.map((lot) => {
                      const lotIsBlocked = Number(lot.availableQuantity ?? 0) <= 0;

                      return (
                        <SelectItem key={lot.id} value={String(lot.id)}>
                          {lot.lotCode} - {lot.productName ?? t("marketplaceSeller.productForm.harvestLotFallback", "Harvested lot")}
                          {lotIsBlocked
                            ? ` (${t("marketplaceSeller.productForm.lotInfo.notEligible", "không đủ điều kiện")})`
                            : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm">
                {selectedLot ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t("marketplaceSeller.productForm.lotInfo.lotCode", "Lot code")}</span>
                      <span className="font-medium text-foreground">{selectedLot.lotCode}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t("marketplaceSeller.productForm.lotInfo.farm", "Farm")}</span>
                      <span className="font-medium text-foreground">
                        {selectedLot.farmName ?? t("marketplaceSeller.productForm.lotInfo.unknown", "Unknown")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t("marketplaceSeller.productForm.lotInfo.season", "Season")}</span>
                      <span className="font-medium text-foreground">
                        {selectedLot.seasonName ?? t("marketplaceSeller.productForm.lotInfo.unknown", "Unknown")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {t("marketplaceSeller.productForm.lotInfo.availableQuantity", "Available quantity")}
                      </span>
                      <span className={selectedLotIsApprovalBlocked ? "font-medium text-destructive" : "font-medium text-foreground"}>
                        {selectedLot.availableQuantity} {selectedLot.unit ?? ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t("marketplaceSeller.productForm.lotInfo.harvested", "Harvested")}</span>
                      <span className="font-medium text-foreground">
                        {selectedLot.harvestedAt
                          ? formatDate(selectedLot.harvestedAt, locale)
                          : t("marketplaceSeller.productForm.lotInfo.na", "N/A")}
                      </span>
                    </div>
                    {selectedLotIsApprovalBlocked ? (
                      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                        {t(
                          "marketplaceSeller.productForm.lotInfo.notEligibleMessage",
                          "Lô này hiện không đủ điều kiện đăng bán vì không còn số lượng khả dụng.",
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {t("marketplaceSeller.productForm.selectLotFirst.title", "Select a harvested lot first.")}
                    </p>
                    <p className="text-muted-foreground">
                      {t(
                        "marketplaceSeller.productForm.selectLotFirst.description",
                        "Farm, season, traceability, and quantity limits are driven by that lot.",
                      )}
                    </p>
                  </div>
                )}
              </div>

              {lotsAlreadyLinkedCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("marketplaceSeller.productForm.lotsLinkedNotice", {
                    count: lotsAlreadyLinkedCount,
                    defaultValue:
                      "{{count}} harvested lots are already linked to other marketplace listings and excluded here.",
                  })}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>{t("marketplaceSeller.productForm.sections.preview", "Listing preview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/50">
                {imagePreviewSrc ? (
                  <img
                    src={imagePreviewSrc}
                    alt={form.name || t("marketplaceSeller.productForm.preview.title", "Listing preview")}
                    className="h-48 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                    {t("marketplaceSeller.productForm.preview.imageFallback", "Product image preview")}
                  </div>
                )}
              </div>

              <div>
                <p className="text-lg font-semibold text-foreground">
                  {form.name || t("marketplaceSeller.productForm.preview.untitled", "Untitled listing")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {form.shortDescription ||
                    t("marketplaceSeller.productForm.preview.shortDescriptionFallback", "Short description preview")}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t("marketplaceSeller.productForm.preview.price", "Price")}</span>
                  <span className="font-semibold text-primary">
                    {Number(form.price) > 0 ? formatVnd(Number(form.price), locale) : "--"}
                    {selectedLot?.unit ? ` / ${selectedLot.unit}` : ""}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("marketplaceSeller.productForm.preview.quantityToSell", "Quantity to sell")}
                  </span>
                  <span className="font-medium text-foreground">
                    {form.stockQuantity || "--"} {selectedLot?.unit ?? ""}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("marketplaceSeller.productForm.preview.traceability", "Traceability")}
                  </span>
                  <span className="font-medium text-primary">
                    {selectedLot
                      ? t("marketplaceSeller.productForm.preview.traceabilityEnabled", "Enabled from harvest lot")
                      : t("marketplaceSeller.productForm.preview.traceabilityWaiting", "Waiting for lot")}
                  </span>
                </div>
              </div>

              {productModerationReason ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {t("marketplaceSeller.productForm.adminReasonPrefix", "Admin reason")}: {productModerationReason}
                </div>
              ) : null}

              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={!canSubmit || isSavingProduct}
                  className="w-full shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  {isSavingProduct
                    ? t("marketplaceSeller.productForm.actions.saving", "Saving...")
                    : saveWillRequireReview
                      ? t("marketplaceSeller.productForm.actions.saveAndResubmit", "Lưu và gửi duyệt lại")
                      : isEdit
                      ? t("marketplaceSeller.productForm.actions.saveChanges", "Save changes")
                      : t("marketplaceSeller.productForm.actions.createDraft", "Create draft")}
                </Button>

                {isEdit && product && getNextSellerProductStatusAction(product.status) ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStatusTransition}
                    disabled={statusMutation.isPending}
                    className="w-full shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    {statusMutation.isPending
                      ? t("marketplaceSeller.productForm.actions.updating", "Updating...")
                      : nextStatusActionLabel(product.status, t)}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
