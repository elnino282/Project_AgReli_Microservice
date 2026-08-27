import { useState } from "react";
import {
  ArrowRight,
  DollarSign,
  Package,
  Plus,
  ShoppingBag,
  Sprout,
  Store,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { MarketplaceStatsUnavailableReason } from "@/shared/api";
import {
  AsyncState,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ImagePlaceholder,
  PageContainer,
} from "@/shared/ui";
import { useMarketplaceFarmerDashboard, useMarketplaceFarmerProducts } from "@/features/marketplace/hooks";
import { SellerMarketplaceTabs } from "@/features/marketplace/layout";
import { formatDateTime, formatVnd } from "@/features/marketplace/lib/format";
import { getMarketplaceOrderStatusLabel } from "@/features/marketplace/lib/orderStatus";

type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  helperText,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string | number;
  tone: string;
  helperText?: string;
}) {
  return (
    <Card variant="metric" className="group h-full overflow-hidden border-border/70 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex min-h-36 flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
            <Icon size={20} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-5 min-w-0">
          <p className="break-words font-display text-3xl font-semibold leading-none tracking-tight text-foreground">
            {value}
          </p>
          {helperText ? <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{helperText}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardProductImage({ src, alt }: { src?: string | null; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <ImagePlaceholder label={alt} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}

function orderStatusLabel(status: string, t: Translator) {
  return getMarketplaceOrderStatusLabel(status, t, "marketplaceSeller.status.order");
}

function unavailableReasonLabel(reason: MarketplaceStatsUnavailableReason, t: Translator) {
  switch (reason) {
    case "NO_PRODUCTS":
      return t(
        "marketplaceSeller.dashboard.unavailableReasons.noProducts",
        "No products in your marketplace catalog yet.",
      );
    case "NO_ORDERS":
      return t(
        "marketplaceSeller.dashboard.unavailableReasons.noOrders",
        "No buyer orders have been created yet.",
      );
    case "NO_REVENUE_DATA":
      return t(
        "marketplaceSeller.dashboard.unavailableReasons.noRevenueData",
        "Revenue data is unavailable because there are no orders yet.",
      );
    case "NO_COMPLETED_ORDERS":
      return t(
        "marketplaceSeller.dashboard.unavailableReasons.noCompletedOrders",
        "Revenue remains unavailable until at least one order is completed.",
      );
    default:
      return t(
        "marketplaceSeller.dashboard.unavailableReasons.fallback",
        "Some dashboard metrics are unavailable.",
      );
  }
}

export function SellerDashboardPage() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const dashboardQuery = useMarketplaceFarmerDashboard();
  const productsQuery = useMarketplaceFarmerProducts({ page: 0, size: 20, status: "ACTIVE" });

  const dashboard = dashboardQuery.data;
  const hasProducts = dashboard?.hasProducts ?? false;
  const hasOrders = dashboard?.hasOrders ?? false;
  const hasRevenueData = dashboard?.hasRevenueData ?? false;
  const unavailableReasons = dashboard?.unavailableReasons ?? [];

  const topProducts = (productsQuery.data?.items ?? [])
    .slice()
    .sort((left, right) => right.availableQuantity - left.availableQuantity)
    .slice(0, 5);

  return (
    <PageContainer variant="wide">
      <div className="space-y-4 md:space-y-5">
        <SellerMarketplaceTabs />

        <AsyncState
          isLoading={dashboardQuery.isLoading}
          isEmpty={false}
          error={dashboardQuery.isError ? (dashboardQuery.error as Error) : null}
          onRetry={() => dashboardQuery.refetch()}
          loadingText={t("marketplaceSeller.dashboard.loading", "Loading marketplace dashboard...")}
        >


          {!hasProducts ? (
            <Card className="overflow-hidden border border-dashed border-border bg-muted/30 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center space-y-6 p-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-info/10 text-info ring-1 ring-info/20">
                  <Sprout size={40} strokeWidth={1.5} />
                </div>
                <div className="max-w-md space-y-2">
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    {t("marketplaceSeller.dashboard.emptyProducts.title", "No products yet")}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(
                      "marketplaceSeller.dashboard.emptyProducts.description",
                      "Start your selling journey by publishing your first agricultural product. Once you have products, revenue and order metrics will activate.",
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 pt-2">
                  <Button 
                    onClick={() => navigate("/farmer/marketplace-products/new")} 
                    size="lg" 
                    className="rounded-full shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    {t("marketplaceSeller.dashboard.emptyProducts.actions.createFirst", "Add first product")}
                  </Button>
                </div>
                {unavailableReasons.length > 0 ? (
                  <p className="mt-5 text-xs font-medium text-muted-foreground">
                    {unavailableReasons.map((reason) => unavailableReasonLabel(reason, t)).join(" ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {hasProducts && !hasOrders ? (
            <Card className="overflow-hidden border border-dashed border-border bg-muted/30 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center space-y-6 p-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/20 text-warning-foreground ring-1 ring-warning/30">
                  <ShoppingBag size={40} strokeWidth={1.5} />
                </div>
                <div className="max-w-md space-y-2">
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    {t("marketplaceSeller.dashboard.noOrders.title", "No orders yet")}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(
                      "marketplaceSeller.dashboard.noOrders.description",
                      "Your products are ready on the market! Keep your inventory up to date. New orders will appear here as soon as buyers purchase them.",
                    )}
                  </p>
                </div>
                {unavailableReasons.length > 0 ? (
                  <p className="mt-5 text-xs font-medium text-muted-foreground">
                    {unavailableReasons.map((reason) => unavailableReasonLabel(reason, t)).join(" ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={DollarSign}
              label={t("marketplaceSeller.dashboard.metrics.revenue", "Revenue")}
              value={
                hasRevenueData && dashboard?.totalRevenue != null
                  ? formatVnd(dashboard.totalRevenue, locale)
                  : "--"
              }
              helperText={
                hasRevenueData
                  ? undefined
                  : t("marketplaceSeller.dashboard.metrics.revenueEmpty", "No completed orders yet.")
              }
              tone="bg-primary/10 text-primary"
            />
            <MetricCard
              icon={ShoppingBag}
              label={t("marketplaceSeller.dashboard.metrics.pendingOrders", "Pending orders")}
              value={dashboard?.pendingOrders ?? "--"}
              tone="bg-destructive/10 text-destructive"
            />
            <MetricCard
              icon={Store}
              label={t("marketplaceSeller.dashboard.metrics.pendingReview", "Pending review")}
              value={dashboard?.pendingReviewProducts ?? "--"}
              tone="bg-warning/15 text-warning-foreground"
            />
            <MetricCard
              icon={Package}
              label={t("marketplaceSeller.dashboard.metrics.publishedProducts", "Published products")}
              value={dashboard?.publishedProducts ?? "--"}
              tone="bg-info/10 text-info"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 pt-1 animate-in fade-in slide-in-from-bottom-4 duration-500 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <Card variant="content" className="min-w-0 gap-0 overflow-hidden border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <CardTitle className="font-display text-xl font-semibold tracking-tight text-foreground">
                    {t("marketplaceSeller.dashboard.recentOrders.title", "Recent orders")}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dashboard?.recentOrders?.length ?? 0} {t("marketplaceSeller.tabs.items.orders.label", "orders")}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="shrink-0 text-primary">
                  <Link to="/farmer/marketplace-orders">
                    {t("marketplaceSeller.dashboard.recentOrders.seeAll", "See all")}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                {(dashboard?.recentOrders?.length ?? 0) > 0 ? (
                  dashboard!.recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/farmer/marketplace-orders/${order.id}`}
                      className="group flex min-h-20 items-center gap-3 border-b border-border/60 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ShoppingBag className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">{order.orderCode}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {t("marketplaceSeller.dashboard.recentOrders.itemCount", {
                            count: order.items.length,
                            defaultValue: "{{count}} items",
                          })}{" "}
                          <span className="opacity-50">•</span> {formatDateTime(order.createdAt, locale)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-foreground">{formatVnd(order.totalAmount, locale)}</p>
                        <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {orderStatusLabel(order.status, t)}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex min-h-52 items-center justify-center px-6 py-10 text-center text-sm font-medium text-muted-foreground">
                    {hasProducts
                      ? t("marketplaceSeller.dashboard.recentOrders.emptyWithProducts", "No buyer orders yet.")
                      : t(
                          "marketplaceSeller.dashboard.recentOrders.emptyNoProducts",
                          "Buyer orders will appear after your first product is listed.",
                        )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="content" className="min-w-0 gap-0 overflow-hidden border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <CardTitle className="font-display text-xl font-semibold tracking-tight text-foreground">
                    {t("marketplaceSeller.dashboard.topProducts.title", "Top products")}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topProducts.length} {t("marketplaceSeller.tabs.items.products.label", "products")}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="shrink-0 text-primary">
                  <Link to="/farmer/marketplace-products">
                    {t("marketplaceSeller.dashboard.topProducts.manageProducts", "Manage products")}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                {topProducts.length > 0 ? (
                  topProducts.map((product) => (
                    <div key={product.id} className="group flex min-h-20 items-center gap-3 border-b border-border/60 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-muted/40 sm:px-6">
                      <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/60">
                        <DashboardProductImage src={product.imageUrl} alt={product.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{product.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {formatVnd(product.price, locale)} / {product.unit}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {t("marketplaceSeller.table.available", "Available")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {product.availableQuantity} <span className="text-xs text-muted-foreground">{product.unit}</span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex min-h-52 items-center justify-center px-6 py-10 text-center text-sm font-medium text-muted-foreground">
                    {hasProducts
                      ? t("marketplaceSeller.dashboard.topProducts.emptyWithProducts", "No published products yet.")
                      : t("marketplaceSeller.dashboard.topProducts.emptyNoProducts", "No products available yet.")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </AsyncState>
      </div>
    </PageContainer>
  );
}
