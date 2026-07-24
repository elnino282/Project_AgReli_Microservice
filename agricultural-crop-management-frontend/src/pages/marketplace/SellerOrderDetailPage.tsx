import { useMemo } from "react";
import { CreditCard, MapPin, Phone, Truck } from "lucide-react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { MarketplaceOrderStatus } from "@/shared/api";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { BackButton } from "@/shared/ui/back-button";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { deliveryApi } from "@/shared/api";
import {
  useMarketplaceFarmerOrderDetail,
  useMarketplaceUpdateFarmerOrderStatusMutation,
} from "@/features/marketplace/hooks";
import { SellerMarketplaceTabs } from "@/features/marketplace/layout";
import { formatDateTime, formatVnd } from "@/features/marketplace/lib/format";
import {
  getMarketplaceOrderStatusLabel,
  getMarketplaceOrderStatusTone,
} from "@/features/marketplace/lib/orderStatus";

type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

function nextStatusOptions(status: MarketplaceOrderStatus): MarketplaceOrderStatus[] {
  switch (status) {
    case "PENDING_PAYMENT":
    case "PAYMENT_SUBMITTED":
      return ["REJECTED", "CANCELLED"];
    case "PAYMENT_VERIFIED":
      return ["CONFIRMED", "REJECTED"];
    case "CONFIRMED":
      return ["PREPARING", "CANCELLED"];
    case "PREPARING":
      return ["SHIPPED"];
    case "SHIPPED":
      return ["DELIVERED"];
    case "DELIVERED":
      return ["COMPLETED"];
    case "PENDING":
      return ["CONFIRMED", "CANCELLED"];
    case "DELIVERING":
      return ["DELIVERED"];
    default:
      return [];
  }
}

function sellerOrderStatusLabel(status: MarketplaceOrderStatus, t: Translator) {
  return getMarketplaceOrderStatusLabel(status, t, "marketplaceSeller.status.order");
}

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

function statusBadge(status: MarketplaceOrderStatus, t: Translator) {
  return <Badge variant={statusBadgeVariant(status)}>{sellerOrderStatusLabel(status, t)}</Badge>;
}

function getProviderName(providerId: number): string {
  switch (providerId) {
    case 1:
      return "Giao hàng tiết kiệm (GHTK)";
    case 2:
      return "Giao hàng nhanh (GHN)";
    case 3:
      return "Ninja Van";
    case 4:
      return "J&T Express";
    default:
      return "Đối tác vận chuyển";
  }
}

function dStatusBadgeVariant(status: string) {
  switch (status) {
    case "PENDING":
      return "warning" as const;
    case "PICKUP_SCHEDULED":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return "info" as const;
    case "DELIVERED":
      return "success" as const;
    case "RETURNED":
    case "CANCELLED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function paymentMethodLabel(method: string, t: Translator) {
  switch (method) {
    case "COD":
      return t("marketplaceSeller.orderDetail.paymentMethod.cod", "Cash on delivery");
    case "BANK_TRANSFER":
      return t("marketplaceSeller.orderDetail.paymentMethod.bankTransfer", "Bank transfer");
    default:
      return method;
  }
}

function verificationStatusLabel(status: string, t: Translator) {
  switch (status) {
    case "NOT_REQUIRED":
      return t("marketplaceSeller.orderDetail.verificationStatus.notRequired", "Not required");
    case "AWAITING_PROOF":
      return t("marketplaceSeller.orderDetail.verificationStatus.awaitingProof", "Awaiting proof");
    case "SUBMITTED":
      return t("marketplaceSeller.orderDetail.verificationStatus.submitted", "Submitted");
    case "VERIFIED":
      return t("marketplaceSeller.orderDetail.verificationStatus.verified", "Verified");
    case "REJECTED":
      return t("marketplaceSeller.orderDetail.verificationStatus.rejected", "Rejected");
    default:
      return status;
  }
}

export function SellerOrderDetailPage() {
  const { t, locale } = useI18n();
  const { id } = useParams();
  const orderId = Number(id ?? 0);
  const orderQuery = useMarketplaceFarmerOrderDetail(orderId);
  const deliveryOrdersQuery = useQuery({
    queryKey: ["deliveryOrders", orderId],
    queryFn: () => deliveryApi.getDeliveryOrdersByMarketplaceId(orderId),
    enabled: !!orderId,
  });
  const statusMutation = useMarketplaceUpdateFarmerOrderStatusMutation(orderId);

  const actions = useMemo(
    () => (orderQuery.data ? nextStatusOptions(orderQuery.data.status) : []),
    [orderQuery.data],
  );
  const mutationError =
    statusMutation.isError && statusMutation.error instanceof Error
      ? statusMutation.error.message
      : null;

  if (orderQuery.isLoading) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6 space-y-6">
        <SellerMarketplaceTabs />
        <Card className="border-dashed">
          <CardContent className="p-8 text-sm text-muted-foreground">
            {t("marketplaceSeller.orderDetail.loading", "Loading order detail...")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6 space-y-6">
        <SellerMarketplaceTabs />
        <Card className="border-destructive/30">
          <CardContent className="space-y-4 p-8 text-sm text-destructive">
            <p>{t("marketplaceSeller.orderDetail.error", "Failed to load seller order detail.")}</p>
            <BackButton to="/farmer/marketplace-orders" variant="outline" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = orderQuery.data;

  return (
    <div className="max-w-[1800px] mx-auto px-6 pt-6 space-y-6">
      <SellerMarketplaceTabs />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/farmer/marketplace-orders" />
          <div>
            <p className="text-sm font-medium text-primary">
              {t("marketplaceSeller.common.brand", "Seller Portal")}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">{order.orderCode}</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              type="button"
              variant={action === "CANCELLED" ? "destructive" : "default"}
              onClick={() => statusMutation.mutate({ status: action })}
              disabled={statusMutation.isPending}
              className="shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            >
              {sellerOrderStatusLabel(action, t)}
            </Button>
          ))}
        </div>
      </div>

      {mutationError ? <p className="text-sm text-destructive">{mutationError}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{t("marketplaceSeller.orderDetail.itemsTitle", "Order items")}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(order.createdAt, locale)}</p>
              </div>
              {statusBadge(order.status, t)}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    loading="lazy"
                    className="h-16 w-16 rounded-lg bg-muted/60 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatVnd(item.unitPriceSnapshot, locale)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">{formatVnd(item.lineTotal, locale)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border bg-muted/50 p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("marketplaceSeller.orderDetail.summary.subtotal", "Subtotal")}</span>
                <span>{formatVnd(order.subtotal, locale)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("marketplaceSeller.orderDetail.summary.shippingFee", "Shipping fee")}</span>
                <span>{formatVnd(order.shippingFee, locale)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-bold text-primary">
                <span>{t("marketplaceSeller.orderDetail.summary.total", "Total")}</span>
                <span>{formatVnd(order.totalAmount, locale)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                {t("marketplaceSeller.orderDetail.customerInfo", "Customer information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-1 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{order.shippingRecipientName}</p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddressLine}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{order.shippingPhone}</p>
              </div>
            </CardContent>
          </Card>

          {deliveryOrdersQuery.data && deliveryOrdersQuery.data.length > 0 && (
            <Card className="border-border shadow-sm bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                  <Truck size={16} className="text-primary animate-pulse" />
                  <span>Chi tiết giao hàng</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {deliveryOrdersQuery.data.map((dOrder) => (
                  <div key={dOrder.id} className="space-y-2 pb-3 last:pb-0 last:border-0 border-b border-border/40">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground">Vận đơn: {dOrder.trackingNumber || "N/A"}</span>
                      <Badge variant={dStatusBadgeVariant(dOrder.status)} className="text-[10px] capitalize">
                        {dOrder.status}
                      </Badge>
                    </div>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>Đối tác: {getProviderName(dOrder.providerId)}</p>
                      <p>Cân nặng: {dOrder.weightKg} kg</p>
                      {dOrder.requiresColdChain && (
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] hover:bg-blue-100 mt-1">Chuỗi lạnh (Cold chain)</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                {t("marketplaceSeller.orderDetail.paymentShipping", "Payment and shipping")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard size={16} className="shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{paymentMethodLabel(order.payment.method, t)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("marketplaceSeller.orderDetail.verificationPrefix", "Verification")}:{" "}
                    {verificationStatusLabel(order.payment.verificationStatus, t)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Truck size={16} className="shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("marketplaceSeller.orderDetail.shippingStatus", "Shipping status")}
                  </p>
                  <p className="text-xs text-muted-foreground">{sellerOrderStatusLabel(order.status, t)}</p>
                </div>
              </div>
              {order.note ? (
                <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  {t("marketplaceSeller.orderDetail.notePrefix", "Note")}: {order.note}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
