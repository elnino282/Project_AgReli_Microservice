import {
  DollarSign,
  Package,
  Plus,
  ShoppingBag,
  Sprout,
  Store,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
// eslint-disable-next-line no-restricted-imports
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { MarketplaceStatsUnavailableReason } from "@/shared/api";
import { AsyncState, Button, Card, CardContent, PageContainer } from "@/shared/ui";
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
  layout = "editorial-stat",
}: {
  icon: typeof DollarSign;
  label: string;
  value: string | number;
  tone: string;
  helperText?: string;
  layout?: "editorial-hero" | "editorial-stat";
}) {
  if (layout === "editorial-hero") {
    return (
      <Card className="group relative overflow-hidden border border-primary/20 bg-primary/5 shadow-sm transition-colors duration-300 hover:bg-primary/10">
        <CardContent className="relative z-10 flex h-full min-h-[200px] flex-col justify-between p-8">
          <div className="flex items-center gap-2">
            <Icon size={20} className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
          <div className="mt-8 animate-in slide-in-from-bottom-2 fade-in duration-700 delay-150 fill-mode-both">
            <p className="font-display text-4xl font-semibold leading-none tracking-tight text-foreground md:text-5xl">
              {value}
            </p>
            {helperText ? <p className="mt-3 text-sm font-medium text-muted-foreground">{helperText}</p> : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group flex h-full flex-col justify-between overflow-hidden border border-border/50 bg-card shadow-sm transition-colors duration-300 hover:bg-muted/30">
      <CardContent className="flex h-full flex-col justify-between p-8">
        <div className="mb-6 flex items-center gap-2 text-muted-foreground">
          <Icon size={18} className={tone} />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {value}
          </p>
          {helperText ? <p className="mt-2 text-sm text-muted-foreground">{helperText}</p> : null}
        </div>
      </CardContent>
    </Card>
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

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="md:col-span-2 xl:col-span-1">
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
                tone="text-primary-foreground"
                layout="editorial-hero"
              />
            </div>
            <MetricCard
              icon={ShoppingBag}
              label={t("marketplaceSeller.dashboard.metrics.pendingOrders", "Pending orders")}
              value={dashboard?.pendingOrders ?? "--"}
              tone="text-destructive"
              layout="editorial-stat"
            />
            <MetricCard
              icon={Store}
              label={t("marketplaceSeller.dashboard.metrics.pendingReview", "Pending review")}
              value={dashboard?.pendingReviewProducts ?? "--"}
              tone="text-info"
              layout="editorial-stat"
            />
            <MetricCard
              icon={Package}
              label={t("marketplaceSeller.dashboard.metrics.publishedProducts", "Published products")}
              value={dashboard?.publishedProducts ?? "--"}
              tone="text-muted-foreground"
              layout="editorial-stat"
            />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 xl:grid-cols-2 xl:gap-12">
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
              <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {t("marketplaceSeller.dashboard.recentOrders.title", "Recent orders")}
                </h3>
                <Link 
                  to="/farmer/marketplace-orders" 
                  className="rounded-sm text-xs font-medium uppercase tracking-wider text-primary transition-all duration-200 hover:text-primary/80 active:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  {t("marketplaceSeller.dashboard.recentOrders.seeAll", "See all")}
                </Link>
              </div>
              
              <div className="space-y-0">
                {(dashboard?.recentOrders?.length ?? 0) > 0 ? (
                  dashboard!.recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/farmer/marketplace-orders/${order.id}`}
                      className="group flex items-center justify-between border-b border-border/40 py-4 px-3 -mx-3 sm:px-4 sm:-mx-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
                    >
                      <div>
                        <p className="font-medium text-foreground transition-colors group-hover:text-primary">{order.orderCode}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("marketplaceSeller.dashboard.recentOrders.itemCount", {
                            count: order.items.length,
                            defaultValue: "{{count}} items",
                          })}{" "}
                          <span className="opacity-50">•</span> {formatDateTime(order.createdAt, locale)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{formatVnd(order.totalAmount, locale)}</p>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">{orderStatusLabel(order.status, t)}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-12 text-center text-sm font-medium text-muted-foreground">
                    {hasProducts
                      ? t("marketplaceSeller.dashboard.recentOrders.emptyWithProducts", "No buyer orders yet.")
                      : t(
                          "marketplaceSeller.dashboard.recentOrders.emptyNoProducts",
                          "Buyer orders will appear after your first product is listed.",
                        )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
              <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {t("marketplaceSeller.dashboard.topProducts.title", "Top products")}
                </h3>
                <Link 
                  to="/farmer/marketplace-products" 
                  className="rounded-sm text-xs font-medium uppercase tracking-wider text-primary transition-all duration-200 hover:text-primary/80 active:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  {t("marketplaceSeller.dashboard.topProducts.manageProducts", "Manage products")}
                </Link>
              </div>
              
              <div className="space-y-0">
                {topProducts.length > 0 ? (
                  topProducts.map((product) => (
                    <div key={product.id} className="group flex items-center gap-5 border-b border-border/40 py-4 px-3 -mx-3 sm:px-4 sm:-mx-4 transition-all duration-200 hover:bg-muted/40 rounded-lg">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted/60 shadow-sm ring-1 ring-border/50">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:opacity-90"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">{product.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatVnd(product.price, locale)} / {product.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("marketplaceSeller.table.available", "Available")}
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                          {product.availableQuantity} <span className="text-xs text-muted-foreground">{product.unit}</span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-sm font-medium text-muted-foreground">
                    {hasProducts
                      ? t("marketplaceSeller.dashboard.topProducts.emptyWithProducts", "No published products yet.")
                      : t("marketplaceSeller.dashboard.topProducts.emptyNoProducts", "No products available yet.")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </AsyncState>
      </div>
    </PageContainer>
  );
}
