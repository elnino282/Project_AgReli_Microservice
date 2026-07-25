import { useMemo, useState } from "react";
import { CreditCard, FileCheck, MapPin, Phone, Upload, Truck } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/shared/ui";
import { BackButton } from "@/shared/ui/back-button";
import { deliveryApi } from "@/shared/api";
import {
  useMarketplaceCancelOrderMutation,
  useMarketplaceCreateReviewMutation,
  useMarketplaceOrderDetail,
  useMarketplaceUploadPaymentProofMutation,
} from "@/features/marketplace/hooks";
import { formatDateTime, formatVnd } from "@/features/marketplace/lib/format";

const MAX_PAYMENT_PROOF_BYTES = 10 * 1024 * 1024;
const PAYMENT_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function validatePaymentProof(file: File): string | null {
  if (!PAYMENT_PROOF_TYPES.includes(file.type)) return 'Chỉ hỗ trợ JPG, PNG, WEBP hoặc PDF.';
  if (file.size > MAX_PAYMENT_PROOF_BYTES) return 'Tệp xác nhận thanh toán không được vượt quá 10MB.';
  return null;
}

type ReviewDraft = {
  rating: number;
  comment: string;
};

function StarInput({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={star <= rating ? "text-2xl text-amber-400" : "text-2xl text-slate-200 hover:text-amber-200"}
        >
          ★
        </button>
      ))}
    </div>
  );
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

function statusVariant(status: string) {
  if (status === "COMPLETED" || status === "DELIVERED") return "success" as const;
  if (status === "CANCELLED" || status === "RETURNED") return "destructive" as const;
  if (status === "PENDING_PAYMENT" || status === "PENDING" || status === "PICKUP_SCHEDULED") return "warning" as const;
  return "secondary" as const;
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { t } = useTranslation();
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, ReviewDraft>>({});

  const orderQuery = useMarketplaceOrderDetail(orderId);
  const deliveryOrdersQuery = useQuery({
    queryKey: ["deliveryOrders", orderId],
    queryFn: () => deliveryApi.getDeliveryOrdersByMarketplaceId(orderId),
    enabled: !!orderId,
  });
  const cancelMutation = useMarketplaceCancelOrderMutation(orderId);
  const paymentProofMutation = useMarketplaceUploadPaymentProofMutation(orderId);
  const reviewMutation = useMarketplaceCreateReviewMutation();

  const order = orderQuery.data;
  const cancelError = cancelMutation.error instanceof Error ? cancelMutation.error.message : null;
  const paymentError =
    paymentProofMutation.error instanceof Error ? paymentProofMutation.error.message : null;
  const reviewError = reviewMutation.error instanceof Error ? reviewMutation.error.message : null;

  const paymentMethodLabel = (method: string) => {
    return t(`marketplaceBuyer.myOrders.paymentMethod.${method}`, method);
  };

  const verificationStatusLabel = (status: string) => {
    return t(`marketplaceBuyer.myOrders.paymentVerificationStatus.${status}`, status);
  };

  const paymentStatusLabel = useMemo(() => {
    if (!order) return "";
    return `${paymentMethodLabel(order.payment.method)} · ${verificationStatusLabel(order.payment.verificationStatus)}`;
  }, [order, t]);

  if (orderQuery.isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("marketplaceBuyer.orderDetail.loadingOrder")}
        </div>
      </div>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="space-y-3 rounded-xl border border-dashed border-destructive/30 bg-card p-8 text-center text-sm text-destructive">
          <p>{t("marketplaceBuyer.orderDetail.errorOrder")}</p>
          <BackButton to="/marketplace/orders" variant="outline" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <BackButton to="/marketplace/orders" className="mb-6" />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{order.orderCode}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("marketplaceBuyer.orderDetail.group")}: <span className="font-semibold text-foreground/80">{order.orderGroupCode}</span> · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Badge variant={statusVariant(order.status)} className="px-3 py-1 text-xs font-semibold shadow-sm">
          {t(`marketplaceBuyer.myOrders.status.${order.status}`)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                {t("marketplaceBuyer.orderDetail.itemsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {order.items.map((item) => {
                const draft = reviewDrafts[item.productId] ?? { rating: 5, comment: "" };
                return (
                  <div key={item.id} className="rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:bg-muted/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="h-16 w-16 rounded-lg bg-muted border border-border/40 object-cover shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm sm:text-base leading-tight truncate">{item.productName}</p>
                        <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
                          {item.quantity} x {formatVnd(item.unitPriceSnapshot)}
                        </p>
                      </div>
                      <p className="font-bold text-foreground text-sm sm:text-base shrink-0">{formatVnd(item.lineTotal)}</p>
                    </div>

                    {item.reviewId ? (
                      <Badge variant="success" className="mt-3 font-semibold shadow-xs">
                        {t("marketplaceBuyer.orderDetail.reviewed")}
                      </Badge>
                    ) : item.canReview ? (
                      <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {t("marketplaceBuyer.orderDetail.rateProduct")}
                        </p>
                        <StarInput
                          rating={draft.rating}
                          onChange={(value) =>
                            setReviewDrafts((current) => ({
                              ...current,
                              [item.productId]: { ...draft, rating: value },
                            }))
                          }
                        />
                        <div className="mt-3 flex gap-2">
                          <Input
                            value={draft.comment}
                            onChange={(event) =>
                              setReviewDrafts((current) => ({
                                ...current,
                                [item.productId]: { ...draft, comment: event.target.value },
                              }))
                            }
                            placeholder={t("marketplaceBuyer.orderDetail.reviewPlaceholder")}
                            className="bg-card text-sm border-border/80"
                          />
                          <Button
                            disabled={!draft.comment.trim() || reviewMutation.isPending}
                            onClick={async () => {
                              try {
                                await reviewMutation.mutateAsync({
                                  orderId: order.id,
                                  orderItemId: item.id,
                                  rating: draft.rating,
                                  comment: draft.comment,
                                });
                                await orderQuery.refetch();
                                toast.success('Đánh giá đã được gửi thành công.');
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.');
                              }
                            }}
                            className="shadow-sm font-semibold"
                          >
                            {t("marketplaceBuyer.orderDetail.submitReview")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {reviewError ? <p className="text-sm text-destructive font-medium">{reviewError}</p> : null}

              <div className="space-y-3 border-t border-border/60 pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("marketplaceBuyer.orderDetail.subtotal")}</span>
                  <span className="font-medium text-foreground">{formatVnd(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("marketplaceBuyer.orderDetail.shipping")}</span>
                  <span className="font-medium text-foreground">{formatVnd(order.shippingFee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="font-bold text-foreground text-base">{t("marketplaceBuyer.orderDetail.total")}</span>
                  <span className="text-2xl font-black text-primary tracking-tight">{formatVnd(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {deliveryOrdersQuery.data && deliveryOrdersQuery.data.length > 0 && (
            <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden bg-emerald-50/20">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary animate-bounce" />
                  <span>Theo dõi vận đơn (Delivery Tracking)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 text-sm">
                {deliveryOrdersQuery.data.map((dOrder) => (
                  <div key={dOrder.id} className="space-y-2 pb-3 last:pb-0 last:border-0 border-b border-border/40">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground">Mã vận đơn: {dOrder.trackingNumber || "N/A"}</span>
                      <Badge variant={statusVariant(dOrder.status)} className="text-[10px] capitalize">
                        {dOrder.status}
                      </Badge>
                    </div>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>Nhà vận chuyển: {getProviderName(dOrder.providerId)}</p>
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

          <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("marketplaceBuyer.orderDetail.shippingInfoTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5 text-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm sm:text-base leading-tight">{order.shippingRecipientName}</p>
                  <p className="mt-1 text-muted-foreground leading-relaxed">{order.shippingAddressLine}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium text-foreground">{order.shippingPhone}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("marketplaceBuyer.orderDetail.paymentTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5 text-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm sm:text-base leading-tight">{paymentStatusLabel}</p>
                  {order.note ? (
                    <p className="mt-2 rounded-lg bg-muted/40 border border-border/50 p-2 text-xs text-muted-foreground leading-normal">
                      <span className="font-semibold text-foreground/80">{t("marketplaceBuyer.orderDetail.orderNote")}:</span> {order.note}
                    </p>
                  ) : null}
                </div>
              </div>

              {order.payment.proofFileName ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-100 p-1.5">
                      <FileCheck size={16} className="text-emerald-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-xs sm:text-sm truncate">{order.payment.proofFileName}</p>
                      {order.payment.proofUploadedAt ? (
                        <p className="mt-0.5 text-xs text-muted-foreground/80 font-medium">
                          {t("marketplaceBuyer.orderDetail.proofUploadedAt")}: {formatDateTime(order.payment.proofUploadedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {order.payment.method === "BANK_TRANSFER" ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <Upload size={16} className="text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      {t("marketplaceBuyer.orderDetail.transferProofTitle")}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Hỗ trợ định dạng JPG, PNG, WEBP hoặc PDF tối đa 10MB.
                  </p>
                  <Input
                    aria-label="payment proof"
                    data-testid="payment-proof-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="cursor-pointer border-border/80 bg-card hover:border-primary/50 text-xs py-1 transition-colors"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (!file) {
                        setPaymentFile(null);
                        return;
                      }
                      const message = validatePaymentProof(file);
                      if (message) {
                        toast.error(message);
                        event.currentTarget.value = '';
                        setPaymentFile(null);
                        return;
                      }
                      setPaymentFile(file);
                    }}
                  />
                  <Button
                    disabled={!paymentFile || paymentProofMutation.isPending}
                    onClick={async () => {
                      if (!paymentFile) return;
                      try {
                        await paymentProofMutation.mutateAsync(paymentFile);
                        setPaymentFile(null);
                        await orderQuery.refetch();
                        toast.success('Tải lên xác nhận thanh toán thành công.');
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.');
                      }
                    }}
                    className="w-full mt-2 font-semibold shadow-xs"
                  >
                    <Upload size={14} className="mr-2" />
                    {paymentProofMutation.isPending
                      ? t("marketplaceBuyer.orderDetail.uploading")
                      : t("marketplaceBuyer.orderDetail.uploadProof")}
                  </Button>
                  {paymentError ? <p className="text-sm text-destructive font-medium">{paymentError}</p> : null}
                </div>
              ) : null}

              {order.canCancel ? (
                <Button
                  variant="destructive"
                  className="w-full mt-2 font-semibold shadow-sm"
                  disabled={cancelMutation.isPending}
                  onClick={async () => {
                    try {
                      await cancelMutation.mutateAsync();
                      toast.success('Đơn hàng đã được hủy thành công.');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.');
                    }
                  }}
                >
                  {cancelMutation.isPending
                    ? t("marketplaceBuyer.orderDetail.cancelling")
                    : t("marketplaceBuyer.orderDetail.cancelOrder")}
                </Button>
              ) : null}
              {cancelError ? <p className="text-sm text-destructive font-medium">{cancelError}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
