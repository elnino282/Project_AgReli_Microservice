import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageContainer } from "@/shared/ui";
import { BackButton } from "@/shared/ui/back-button";
import type { MarketplaceProductStatus } from "@/shared/api";
import {
  useMarketplaceFarmerProductDetail,
  useMarketplaceUpdateFarmerProductStatusMutation,
} from "@/features/marketplace/hooks";
import { SellerMarketplaceTabs } from "@/features/marketplace/layout";
import { formatDate, formatVnd } from "@/features/marketplace/lib/format";
import { getNextSellerProductStatusAction } from "@/features/marketplace/lib/sellerProductStatus";

type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

function statusVariant(status: MarketplaceProductStatus) {
  switch (status) {
    case "ACTIVE":
    case "PUBLISHED":
      return "success" as const;
    case "PENDING_REVIEW":
      return "warning" as const;
    case "INACTIVE":
    case "HIDDEN":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    case "SOLD_OUT":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function statusLabel(status: MarketplaceProductStatus, t: Translator): string {
  switch (status) {
    case "ACTIVE":
    case "PUBLISHED":
      return t("marketplaceSeller.status.active", "Đang bán / Đã duyệt");
    case "PENDING_REVIEW":
      return t("marketplaceSeller.status.pendingReview", "Pending review");
    case "INACTIVE":
    case "HIDDEN":
      return t("marketplaceSeller.status.inactive", "Đã ẩn");
    case "REJECTED":
      return t("marketplaceSeller.status.rejected", "Bị từ chối");
    case "DRAFT":
      return t("marketplaceSeller.status.draft", "Draft");
    case "SOLD_OUT":
      return t("marketplaceSeller.status.soldOut", "Sold out");
    default:
      return status;
  }
}

function nextStatusActionLabel(status: MarketplaceProductStatus, t: Translator): string {
  switch (status) {
    case "DRAFT":
      return t("marketplaceSeller.productDetail.actions.submitForReview", "Submit for review");
    case "PENDING_REVIEW":
      return t("marketplaceSeller.productDetail.actions.moveToDraft", "Move back to draft");
    case "ACTIVE":
      return t("marketplaceSeller.productDetail.actions.hideProduct", "Hide product");
    case "INACTIVE":
      return t("marketplaceSeller.productDetail.actions.showProduct", "Show product");
    case "PUBLISHED":
      return t("marketplaceSeller.productDetail.actions.hideProduct", "Hide product");
    case "HIDDEN":
      return t("marketplaceSeller.productDetail.actions.showProduct", "Show product");
    default:
      return t("marketplaceSeller.productDetail.actions.updateStatus", "Update status");
  }
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SellerProductDetailPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const productId = Number(id ?? 0);

  const productQuery = useMarketplaceFarmerProductDetail(productId);
  const product = productQuery.data;
  const statusMutation = useMarketplaceUpdateFarmerProductStatusMutation(productId);

  async function handleStatusTransition() {
    if (!product) {
      return;
    }

    const nextAction = getNextSellerProductStatusAction(product.status);
    if (!nextAction) {
      return;
    }

    try {
      await statusMutation.mutateAsync(nextAction);
    } catch {
      // Query layer exposes the last known state on refetch.
    }
  }

  if (productQuery.isLoading) {
    return (
      <PageContainer variant="wide" className="space-y-6">
        <SellerMarketplaceTabs />
        <Card className="border-dashed">
          <CardContent className="p-8 text-sm text-muted-foreground">
            {t("marketplaceSeller.productDetail.loading", "Loading product detail...")}
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <PageContainer variant="wide" className="space-y-6">
        <SellerMarketplaceTabs />
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {t("marketplaceSeller.productDetail.notFound.title", "Product not found")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "marketplaceSeller.productDetail.notFound.description",
                "This product does not exist or is not available in your seller account.",
              )}
            </p>
            <div className="flex justify-center">
              <BackButton to="/farmer/marketplace-products" variant="outline" />
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const gallery = product.imageUrls.length > 0 ? product.imageUrls : [product.imageUrl];
  const productModerationReason = product.statusReason ?? product.rejectionReason ?? null;

  return (
    <PageContainer variant="wide" className="space-y-6">
      <SellerMarketplaceTabs />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton to="/farmer/marketplace-products" />
          <div>
            <p className="text-sm font-medium text-primary">
              {t("marketplaceSeller.common.brand", "Seller Portal")}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">
              {t("marketplaceSeller.productDetail.title", "Product detail")}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {getNextSellerProductStatusAction(product.status) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStatusTransition}
              disabled={statusMutation.isPending}
              className="gap-2 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-accent active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            >
              {product.status === "ACTIVE" || product.status === "PUBLISHED" ? <EyeOff size={14} /> : <Eye size={14} />}
              {statusMutation.isPending
                ? t("marketplaceSeller.productDetail.actions.updating", "Updating...")
                : nextStatusActionLabel(product.status, t)}
            </Button>
          ) : null}
          <Link to={`/farmer/marketplace-products/${product.id}/edit`}>
            <Button size="sm" className="gap-2 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
              <Pencil size={14} /> {t("marketplaceSeller.productDetail.actions.editListing", "Edit listing")}
            </Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="border-b border-border/50">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("marketplaceSeller.productDetail.updatedLabel", {
                  id: product.id,
                  date: formatDate(product.updatedAt, locale),
                  defaultValue: "Listing #{{id}} - Updated {{date}}",
                })}
              </p>
            </div>
            <Badge variant={statusVariant(product.status)}>{statusLabel(product.status, t)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-6">
          {productModerationReason ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <span className="font-semibold">
                {t("marketplaceSeller.productDetail.adminReasonPrefix", "Lý do từ quản trị")}:
              </span>{" "}
              {productModerationReason}
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/50">
                {gallery[0] ? (
                  <img
                    src={gallery[0]}
                    alt={product.name}
                    loading="lazy"
                    className="h-[360px] w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                    {t("marketplaceSeller.productDetail.noImage", "No image available")}
                  </div>
                )}
              </div>

              {gallery.length > 1 ? (
                <div className="grid grid-cols-3 gap-3">
                  {gallery.slice(0, 3).map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-xl border border-border bg-muted/50">
                      <img
                        src={imageUrl}
                        alt={`${product.name} ${index + 1}`}
                        loading="lazy"
                        className="h-24 w-full object-cover transition-transform duration-300 hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("marketplaceSeller.productDetail.sections.listingInfo", "Listing information")}
                </h3>
                <div className="mt-3 divide-y divide-border/50 rounded-xl bg-muted/50 px-5">
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.category", "Category")}
                    value={product.category || "-"}
                  />
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.price", "Price")}
                    value={
                      <span className="font-semibold text-primary">
                        {formatVnd(product.price, locale)} / {product.unit}
                      </span>
                    }
                  />
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.listedQuantity", "Listed quantity")}
                    value={`${product.stockQuantity} ${product.unit}`}
                  />
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.availableQuantity", "Available quantity")}
                    value={`${product.availableQuantity} ${product.unit}`}
                  />
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.farmer", "Farmer")}
                    value={product.farmerDisplayName}
                  />
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.region", "Region")}
                    value={product.region || "-"}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("marketplaceSeller.productDetail.sections.traceability", "Harvest traceability")}
                </h3>
                <div className="mt-3 divide-y divide-primary/20 rounded-2xl border border-primary/20 bg-primary/10 px-5">
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.farm", "Farm")}
                    value={product.farmName || t("marketplaceSeller.productDetail.notLinked", "Not linked")}
                  />
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.season", "Season")}
                    value={product.seasonName || t("marketplaceSeller.productDetail.notLinked", "Not linked")}
                  />
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.lot", "Lot")}
                    value={product.traceabilityCode || t("marketplaceSeller.productDetail.notLinked", "Not linked")}
                  />
                  <DetailRow
                    label={t("marketplaceSeller.productDetail.fields.traceable", "Traceable")}
                    value={
                      product.traceable
                        ? t("marketplaceSeller.productDetail.traceableYes", "Yes")
                        : t("marketplaceSeller.productDetail.traceableNo", "No")
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("marketplaceSeller.productDetail.sections.description", "Description")}
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {product.description ||
                product.shortDescription ||
                t("marketplaceSeller.productDetail.descriptionFallback", "No product description provided yet.")}
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
