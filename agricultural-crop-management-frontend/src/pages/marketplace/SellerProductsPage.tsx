import { useMemo, useState } from "react";
import { Edit, Eye, EyeOff, Package, PackageOpen, Plus, Search, Send } from "lucide-react";
import { Link } from "react-router-dom";
import type { MarketplaceProductStatus, MarketplaceProductSummary } from "@/shared/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  PageContainer,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
// eslint-disable-next-line no-restricted-imports
import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  useMarketplaceFarmerProducts,
  useMarketplaceUpdateFarmerProductStatusMutation,
} from "@/features/marketplace/hooks";
import { SellerMarketplaceTabs } from "@/features/marketplace/layout";
import { formatDateTime, formatVnd } from "@/features/marketplace/lib/format";
import {
  getNextSellerProductStatusAction,
  getNextSellerProductStatusLabel,
} from "@/features/marketplace/lib/sellerProductStatus";

function statusVariant(status: MarketplaceProductStatus) {
  switch (status) {
    case "ACTIVE":
    case "PUBLISHED":
      return "success" as const;
    case "PENDING_REVIEW":
      return "warning" as const;
    case "HIDDEN":
    case "INACTIVE":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    case "SOLD_OUT":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function useStatusLabel() {
  const { t } = useI18n();
  return (status: MarketplaceProductStatus) => {
    switch (status) {
      case "DRAFT":
        return t("marketplaceSeller.status.draft");
      case "PENDING_REVIEW":
        return t("marketplaceSeller.status.pendingReview");
      case "ACTIVE":
      case "PUBLISHED":
        return t("marketplaceSeller.status.active", "Đang bán / Đã duyệt");
      case "INACTIVE":
      case "HIDDEN":
        return t("marketplaceSeller.status.inactive", "Đã ẩn");
      case "REJECTED":
        return t("marketplaceSeller.status.rejected", "Bị từ chối");
      case "SOLD_OUT":
        return t("marketplaceSeller.status.soldOut", "Hết hàng");
      default:
        return status;
    }
  };
}

function moderationReason(product: MarketplaceProductSummary) {
  return product.statusReason ?? product.rejectionReason ?? null;
}

function ProductActions({ product }: { product: MarketplaceProductSummary }) {
  const { t } = useI18n();
  const mutation = useMarketplaceUpdateFarmerProductStatusMutation(product.id);
  const nextAction = getNextSellerProductStatusAction(product.status);
  const isPublished = product.status === "ACTIVE" || product.status === "PUBLISHED";
  const isHidden = product.status === "INACTIVE" || product.status === "HIDDEN";
  const isDraft = product.status === "DRAFT";
  const statusActionLabel = isPublished
    ? t("marketplaceSeller.products.actions.hide", "Hide product")
    : isHidden
      ? t("marketplaceSeller.products.actions.show", "Show product")
      : getNextSellerProductStatusLabel(product.status);
  const editLabel = t("marketplaceSeller.products.actions.edit", "Edit product");

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-muted hover:text-foreground"
        disabled={mutation.isPending || !nextAction}
        title={statusActionLabel}
        aria-label={statusActionLabel}
        onClick={() => {
          if (nextAction) {
            mutation.mutate(nextAction);
          }
        }}
      >
        {isPublished ? <EyeOff size={16} /> : isHidden ? <Eye size={16} /> : isDraft ? <Send size={16} /> : <Package size={16} />}
      </Button>
      <Button asChild variant="ghost" size="icon" className="text-primary hover:bg-primary/10 hover:text-primary">
        <Link to={`/farmer/marketplace-products/${product.id}/edit`} aria-label={editLabel}>
          <Edit size={16} />
        </Link>
      </Button>
    </div>
  );
}

function ProductEmptyState() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PackageOpen size={24} />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">
          {t("marketplaceSeller.products.emptyTitle", "No matching products")}
        </p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t(
            "marketplaceSeller.products.emptyDescription",
            "Adjust filters or add a new product so customers can place orders.",
          )}
        </p>
      </div>
      <Button asChild size="sm" className="shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
        <Link to="/farmer/marketplace-products/new">
          <Plus className="h-4 w-4 mr-1.5" />
          {t("marketplaceSeller.products.addProduct")}
        </Link>
      </Button>
    </div>
  );
}

function ProductMobileCard({
  product,
  statusLabel,
  locale,
}: {
  product: MarketplaceProductSummary;
  statusLabel: (status: MarketplaceProductStatus) => string;
  locale: string;
}) {
  const { t } = useI18n();
  const reason = moderationReason(product);

  return (
    <article className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex gap-3 sm:gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted/60">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/farmer/marketplace-products/${product.id}`}
                className="line-clamp-2 font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline rounded-sm"
              >
                {product.name}
              </Link>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.shortDescription}</p>
            </div>
            <Badge variant={statusVariant(product.status)} className="shrink-0">
              {statusLabel(product.status)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{t("marketplaceSeller.table.price")}</p>
          <p className="font-semibold text-foreground">
            {formatVnd(product.price, locale)} / {product.unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("marketplaceSeller.table.stock")}</p>
          <p className="font-semibold text-foreground">
            {product.availableQuantity} / {product.stockQuantity} {product.unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("marketplaceSeller.table.category")}</p>
          <p className="font-medium text-foreground">{product.category || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("marketplaceSeller.table.updated")}</p>
          <p className="font-medium text-foreground">{formatDateTime(product.updatedAt, locale)}</p>
        </div>
      </div>

      {reason ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {t("marketplaceSeller.table.adminReason")}: {reason}
        </p>
      ) : null}

      <div className="mt-3 flex justify-end">
        <ProductActions product={product} />
      </div>
    </article>
  );
}

export function SellerProductsPage() {
  const { t, locale } = useI18n();
  const statusLabel = useStatusLabel();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | MarketplaceProductStatus>("ALL");

  const query = useMemo(
    () => ({
      page: 0,
      size: 100,
      q: search.trim() || undefined,
      status: status === "ALL" ? undefined : status,
    }),
    [search, status],
  );

  const productsQuery = useMarketplaceFarmerProducts(query);
  const products = productsQuery.data?.items ?? [];
  const hasProducts = products.length > 0;

  return (
    <PageContainer variant="wide">
      <div className="space-y-4 md:space-y-5">
        <SellerMarketplaceTabs />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold leading-tight text-foreground md:text-2xl">
              <Package className="h-5 w-5 text-primary md:h-6 md:w-6" />
              {t("marketplaceSeller.products.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("marketplaceSeller.products.subtitle")}
            </p>
          </div>

          <Button asChild className="w-full sm:w-auto shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
            <Link to="/farmer/marketplace-products/new">
              <Plus className="h-4 w-4 mr-1.5" />
              {t("marketplaceSeller.products.addProduct")}
            </Link>
          </Button>
        </div>

        <Card variant="filter" className="rounded-lg">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="space-y-1.5">
                <Label htmlFor="seller-product-search" className="text-xs font-semibold text-muted-foreground">
                  {t("marketplaceSeller.products.searchLabel", "Search products")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                  <Input
                    id="seller-product-search"
                    type="text"
                    placeholder={t("marketplaceSeller.products.searchPlaceholder")}
                    className="h-10 rounded-md border-border pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seller-product-status-filter" className="text-xs font-semibold text-muted-foreground">
                  {t("marketplaceSeller.products.statusLabel", "Status")}
                </Label>
                <Select value={status} onValueChange={(value) => setStatus(value as "ALL" | MarketplaceProductStatus)}>
                  <SelectTrigger
                    id="seller-product-status-filter"
                    aria-label={t("marketplaceSeller.products.statusLabel", "Status")}
                    className="h-10 rounded-md border-border"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("marketplaceSeller.filters.allStatuses")}</SelectItem>
                    <SelectItem value="DRAFT">{t("marketplaceSeller.status.draft")}</SelectItem>
                    <SelectItem value="PENDING_REVIEW">{t("marketplaceSeller.status.pendingReview")}</SelectItem>
                    <SelectItem value="ACTIVE">{t("marketplaceSeller.status.active", "Đang bán / Đã duyệt")}</SelectItem>
                    <SelectItem value="INACTIVE">{t("marketplaceSeller.status.inactive", "Đã ẩn")}</SelectItem>
                    <SelectItem value="REJECTED">{t("marketplaceSeller.status.rejected", "Bị từ chối")}</SelectItem>
                    <SelectItem value="SOLD_OUT">{t("marketplaceSeller.status.soldOut", "Hết hàng")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!productsQuery.isLoading && !productsQuery.isError && !hasProducts ? (
          <div className="py-8">
            <ProductEmptyState />
          </div>
        ) : null}

        {productsQuery.isLoading || productsQuery.isError || hasProducts ? (
        <div className="hidden overflow-hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="pl-4"><span className="sr-only">{t("marketplaceSeller.table.product")}</span></TableHead>
                <TableHead>{t("marketplaceSeller.table.category")}</TableHead>
                <TableHead>{t("marketplaceSeller.table.price")}</TableHead>
                <TableHead>{t("marketplaceSeller.table.stock")}</TableHead>
                <TableHead>{t("marketplaceSeller.table.status")}</TableHead>
                <TableHead>{t("marketplaceSeller.table.updated")}</TableHead>
                <TableHead className="pr-4 text-right">{t("marketplaceSeller.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted/60">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/farmer/marketplace-products/${product.id}`}
                          className="block truncate font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline rounded-sm"
                        >
                          {product.name}
                        </Link>
                        <p className="max-w-[360px] truncate text-xs text-muted-foreground">
                          {product.shortDescription}
                        </p>
                        {moderationReason(product) ? (
                          <p className="mt-1 text-xs font-medium text-destructive">
                            {t("marketplaceSeller.table.adminReason")}: {moderationReason(product)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.category || "-"}</TableCell>
                  <TableCell className="font-medium text-foreground">
                    {formatVnd(product.price, locale)} / {product.unit}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>
                      {product.stockQuantity} {product.unit}
                    </div>
                    <div className="text-xs text-muted-foreground/70">
                      {t("marketplaceSeller.table.available")}: {product.availableQuantity} {product.unit}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(product.status)}>{statusLabel(product.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(product.updatedAt, locale)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <ProductActions product={product} />
                  </TableCell>
                </TableRow>
              ))}
              {productsQuery.isLoading ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={`product-skeleton-${index}`}>
                    <TableCell className="pl-4">
                      <div className="h-5 w-56 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="ml-auto h-8 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : null}
              {productsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-8 text-center text-sm text-destructive">
                    {t("marketplaceSeller.products.loadError")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        ) : null}

        {productsQuery.isLoading || productsQuery.isError || hasProducts ? (
        <section
          className="space-y-3 md:hidden"
          role="region"
          aria-label={t("marketplaceSeller.products.mobileListLabel", "Product card list")}
        >
          {productsQuery.isLoading ? (
            <Card className="rounded-lg">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {t("marketplaceSeller.products.loading")}
              </CardContent>
            </Card>
          ) : null}
          {!productsQuery.isLoading && !productsQuery.isError && hasProducts
            ? products.map((product) => (
                <ProductMobileCard
                  key={product.id}
                  product={product}
                  statusLabel={statusLabel}
                  locale={locale}
                />
              ))
            : null}
          {productsQuery.isError ? (
            <Card className="rounded-lg">
              <CardContent className="p-6 text-center text-sm text-destructive">
                {t("marketplaceSeller.products.loadError")}
              </CardContent>
            </Card>
          ) : null}
        </section>
        ) : null}
      </div>
    </PageContainer>
  );
}
