import { useState } from "react";
import { Eye, Inbox, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import type { MarketplaceOrderStatus } from "@/shared/api";
// eslint-disable-next-line no-restricted-imports
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { cn } from "@/shared/lib";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { useMarketplaceFarmerOrders } from "@/features/marketplace/hooks";
import { SellerMarketplaceTabs } from "@/features/marketplace/layout";
import { formatDate, formatVnd } from "@/features/marketplace/lib/format";
import {
  getMarketplaceOrderStatusLabel,
  getMarketplaceOrderStatusTone,
  type CanonicalMarketplaceOrderStatus,
} from "@/features/marketplace/lib/orderStatus";

type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

const SELLER_ORDER_FILTER_STATUSES: CanonicalMarketplaceOrderStatus[] = [
  "PENDING_PAYMENT",
  "PAYMENT_SUBMITTED",
  "PAYMENT_VERIFIED",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

function statusBadgeVariant(status: MarketplaceOrderStatus) {
  switch (getMarketplaceOrderStatusTone(status)) {
    case "warning":
      return "warning" as const;
    case "info":
      return "info" as const;
    case "success":
      return "success" as const;
    case "destructive":
      return "destructive" as const;
    case "neutral":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function orderStatusLabel(status: MarketplaceOrderStatus, t: Translator) {
  return getMarketplaceOrderStatusLabel(status, t, "marketplaceSeller.status.order");
}

function statusBadge(status: MarketplaceOrderStatus, t: Translator) {
  return <Badge variant={statusBadgeVariant(status)}>{orderStatusLabel(status, t)}</Badge>;
}

function buyerName(order: {
  shippingRecipientName?: string | null;
  buyerUserId: number;
}, t: Translator) {
  return order.shippingRecipientName ||
    t("marketplaceSeller.orders.table.buyerFallback", {
      id: order.buyerUserId,
      defaultValue: "Buyer #{{id}}",
    });
}

function OrderEmptyState() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <Inbox size={24} />
      </span>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("marketplaceSeller.orders.empty", "No orders matched the current filter.")}
      </p>
    </div>
  );
}

function OrderMobileCard({
  order,
  t,
  locale,
}: {
  order: {
    id: number;
    orderCode: string;
    createdAt: string;
    shippingRecipientName?: string | null;
    buyerUserId: number;
    totalAmount: number;
    status: MarketplaceOrderStatus;
  };
  t: Translator;
  locale: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{order.orderCode}</p>
          <p className="mt-1 text-sm text-muted-foreground">{buyerName(order, t)}</p>
        </div>
        {statusBadge(order.status, t)}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">
            {t("marketplaceSeller.orders.table.orderDate", "Order date")}
          </p>
          <p className="font-medium text-foreground">{formatDate(order.createdAt, locale)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("marketplaceSeller.orders.table.total", "Total")}</p>
          <p className="font-semibold text-primary">{formatVnd(order.totalAmount, locale)}</p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button asChild variant="outline" size="sm" className="transition-all duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
          <Link to={`/farmer/marketplace-orders/${order.id}`}>
            <Eye size={16} className="mr-1.5" />
            {t("marketplaceSeller.orders.table.detail", "Detail")}
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function SellerOrdersPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<"ALL" | MarketplaceOrderStatus>("ALL");

  const statusOptions: Array<{ value: "ALL" | MarketplaceOrderStatus; label: string }> = [
    { value: "ALL", label: t("marketplaceSeller.orders.filters.all", "All") },
    ...SELLER_ORDER_FILTER_STATUSES.map((value) => ({
      value,
      label: orderStatusLabel(value, t),
    })),
  ];
  const ordersQuery = useMarketplaceFarmerOrders({
    page: 0,
    size: 50,
    status: status === "ALL" ? undefined : status,
  });
  const orders = ordersQuery.data?.items ?? [];
  const hasOrders = orders.length > 0;

  return (
    <PageContainer variant="wide">
      <div className="space-y-4 md:space-y-5">
        <SellerMarketplaceTabs />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold leading-tight text-foreground md:text-2xl">
              <ShoppingBag className="h-5 w-5 text-primary md:h-6 md:w-6" />
              {t("marketplaceSeller.orders.title", "Manage orders")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t(
                "marketplaceSeller.orders.subtitle",
                "Track buyer orders, monitor status transitions, and open order details for fulfillment.",
              )}
            </p>
          </div>
        </div>

        <div className="py-2">
          <Label htmlFor="seller-order-status-filter" className="mb-2 block text-xs font-semibold text-muted-foreground">
            {t("marketplaceSeller.orders.filters.label", "Filter orders")}
          </Label>
          <div className="max-w-xs">
            <Select value={status} onValueChange={(value) => setStatus(value as "ALL" | MarketplaceOrderStatus)}>
              <SelectTrigger
                id="seller-order-status-filter"
                aria-label={t("marketplaceSeller.orders.filters.ariaLabel", "Order status filters")}
                className="h-10 rounded-md border-border"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="pl-4">{t("marketplaceSeller.orders.table.orderCode", "Order code")}</TableHead>
                <TableHead>{t("marketplaceSeller.orders.table.orderDate", "Order date")}</TableHead>
                <TableHead>{t("marketplaceSeller.orders.table.customer", "Customer")}</TableHead>
                <TableHead>Loại giao hàng</TableHead>
                <TableHead>{t("marketplaceSeller.orders.table.total", "Total")}</TableHead>
                <TableHead>{t("marketplaceSeller.orders.table.status", "Status")}</TableHead>
                <TableHead className="pr-4 text-right">
                  {t("marketplaceSeller.orders.table.actions", "Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQuery.isLoading
                ? Array.from({ length: 5 }, (_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="pl-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="ml-auto h-8 w-20 animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!ordersQuery.isLoading && !ordersQuery.isError
                ? orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="pl-4 font-medium text-foreground">{order.orderCode}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(order.createdAt, locale)}</TableCell>
                      <TableCell className="text-muted-foreground">{buyerName(order, t)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50">
                          Giao 1 lần
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {formatVnd(order.totalAmount, locale)}
                      </TableCell>
                      <TableCell>{statusBadge(order.status, t)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary/10 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background">
                          <Link to={`/farmer/marketplace-orders/${order.id}`}>
                            <Eye size={16} className="mr-1.5" />
                            {t("marketplaceSeller.orders.table.detail", "Detail")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!ordersQuery.isLoading && !ordersQuery.isError && !hasOrders ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <OrderEmptyState />
                  </TableCell>
                </TableRow>
              ) : null}

              {ordersQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-8 text-center text-sm text-destructive">
                    {t("marketplaceSeller.orders.error", "Failed to load seller orders.")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <section
          className="space-y-3 md:hidden"
          role="region"
          aria-label={t("marketplaceSeller.orders.mobileListLabel", "Order card list")}
        >
          {ordersQuery.isLoading ? (
            <Card className="rounded-lg">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {t("marketplaceSeller.dashboard.loading", "Loading marketplace dashboard...")}
              </CardContent>
            </Card>
          ) : null}
          {!ordersQuery.isLoading && !ordersQuery.isError && hasOrders
            ? orders.map((order) => (
                <OrderMobileCard key={order.id} order={order} t={t} locale={locale} />
              ))
            : null}
          {!ordersQuery.isLoading && !ordersQuery.isError && !hasOrders ? (
            <Card className="rounded-lg">
              <CardContent className="p-0">
                <OrderEmptyState />
              </CardContent>
            </Card>
          ) : null}
          {ordersQuery.isError ? (
            <Card className="rounded-lg">
              <CardContent className="p-6 text-center text-sm text-destructive">
                {t("marketplaceSeller.orders.error", "Failed to load seller orders.")}
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </PageContainer>
  );
}
