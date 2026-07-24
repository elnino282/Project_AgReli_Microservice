import { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Building2, MapPin, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/shared/lib";
import { BackButton, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/shared/ui";
import { useQuery } from "@tanstack/react-query";
import type {
  MarketplaceAddress,
  MarketplaceAddressUpsertRequest,
  MarketplacePaymentMethod,
  MarketplaceCart,
  MarketplaceCartItem,
  ShippingOption,
} from "@/shared/api";
import { deliveryApi } from "@/shared/api";
import {
  useCheckoutValidation,
  useMarketplaceAddresses,
  useMarketplaceCart,
  useMarketplaceCreateAddressMutation,
  useMarketplaceCreateOrderMutation,
  useMarketplaceDeleteAddressMutation,
  useMarketplaceUpdateAddressMutation,
} from "@/features/marketplace/hooks";
import { formatVnd } from "@/features/marketplace/lib/format";

function createCheckoutIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildCartFingerprint(
  cart: { items: Array<{ productId: number; quantity: number }> } | undefined,
): string {
  if (!cart || cart.items.length === 0) {
    return "empty";
  }
  return cart.items
    .slice()
    .sort((left, right) => left.productId - right.productId)
    .map((item) => `${item.productId}:${item.quantity}`)
    .join("|");
}

type AddressFormState = MarketplaceAddressUpsertRequest;

function emptyAddressForm(): AddressFormState {
  return {
    fullName: "",
    phone: "",
    province: "",
    district: "", // Backend requires district; auto-synced with ward
    ward: "",
    street: "",
    detail: "",
    label: "home",
    isDefault: false,
  };
}

function toAddressForm(address: MarketplaceAddress): AddressFormState {
  return {
    fullName: address.fullName,
    phone: address.phone,
    province: address.province,
    district: address.district, // Backend requires district
    ward: address.ward,
    street: address.street,
    detail: address.detail ?? "",
    label: address.label,
    isDefault: address.isDefault,
  };
}

function formatAddressLabel(address: MarketplaceAddress): string {
  const detail = address.detail?.trim();
  const detailPart = detail ? `, ${detail}` : "";
  return `${address.fullName} - ${address.phone} - ${address.street}${detailPart}, ${address.ward}, ${address.province}`;
}

function resolveShippingAddressLine(address: MarketplaceAddress | null, manualAddressLine: string): string | undefined {
  const trimmedManual = manualAddressLine.trim();
  if (trimmedManual) {
    return trimmedManual;
  }
  if (!address) {
    return undefined;
  }
  const detail = address.detail?.trim();
  return `${address.street}${detail ? `, ${detail}` : ""}, ${address.ward}, ${address.province}`;
}

function resolveDraftShippingAddressLine(form: AddressFormState): string | undefined {
  if (!isAddressFormValid(form)) {
    return undefined;
  }
  const detail = form.detail?.trim();
  return `${form.street}${detail ? `, ${detail}` : ""}, ${form.ward}, ${form.province}`;
}

function isAddressFormValid(form: AddressFormState): boolean {
  return [
    form.fullName,
    form.phone,
    form.province,
    form.ward,
    form.street,
  ].every((value) => value.trim().length > 0);
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const buyNowItem = location.state?.buyNowItem as {
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    farmerUserId: number;
    farmerName: string | null;
    imageUrl: string;
    slug: string;
    traceable: boolean;
  } | undefined;

  const cartQuery = useMarketplaceCart();
  const addressesQuery = useMarketplaceAddresses();
  const createAddressMutation = useMarketplaceCreateAddressMutation();
  const updateAddressMutation = useMarketplaceUpdateAddressMutation();
  const deleteAddressMutation = useMarketplaceDeleteAddressMutation();
  const createOrderMutation = useMarketplaceCreateOrderMutation();
  const { validateCheckout } = useCheckoutValidation();

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [note, setNote] = useState("");
  const [deliverySchedule, setDeliverySchedule] = useState<"one-time" | "weekly" | "monthly">("one-time");
  const [deliveryDay, setDeliveryDay] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<MarketplacePaymentMethod>("COD");
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>(
    () => createCheckoutIdempotencyKey(),
  );
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved");
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(() => emptyAddressForm());
  const [addressFormMessage, setAddressFormMessage] = useState<string | null>(null);
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption | null>(null);
  const [isGroupedDelivery, setIsGroupedDelivery] = useState(false);

  const mockCart = useMemo<MarketplaceCart | undefined>(() => {
    if (!buyNowItem) return undefined;
    const items: MarketplaceCartItem[] = [
      {
        productId: buyNowItem.productId,
        slug: buyNowItem.slug,
        name: buyNowItem.name,
        imageUrl: buyNowItem.imageUrl,
        unitPrice: buyNowItem.unitPrice,
        quantity: buyNowItem.quantity,
        maxQuantity: buyNowItem.quantity,
        farmerUserId: buyNowItem.farmerUserId,
        traceable: buyNowItem.traceable,
      },
    ];
    return {
      userId: 0,
      items,
      sellerGroups: [
        {
          farmerUserId: buyNowItem.farmerUserId,
          farmerName: buyNowItem.farmerName,
          farmId: null,
          farmName: buyNowItem.farmerName,
          items,
          subtotal: buyNowItem.unitPrice * buyNowItem.quantity,
        },
      ],
      itemCount: buyNowItem.quantity,
      subtotal: buyNowItem.unitPrice * buyNowItem.quantity,
      currency: "VND",
    };
  }, [buyNowItem]);

  const cart = mockCart ?? cartQuery.data;
  const cartFingerprint = useMemo(() => buildCartFingerprint(cart), [cart]);
  const lastCartFingerprintRef = useRef<string>("");

  const splitOrderGroups = useMemo(() => {
    if (!cart) return [];
    /* Prefer API-provided sellerGroups (includes farmerName, farmName) */
    if (cart.sellerGroups && cart.sellerGroups.length > 0) {
      return cart.sellerGroups.map((group) => ({
        farmerUserId: group.farmerUserId,
        farmerName: group.farmerName,
        items: group.items,
      }));
    }
    /* Fallback: manual grouping for backward compatibility */
    const groups = new Map<number, typeof cart.items>();
    cart.items.forEach((item) => {
      groups.set(item.farmerUserId, [...(groups.get(item.farmerUserId) ?? []), item]);
    });
    return Array.from(groups.entries()).map(([farmerUserId, items]) => ({ farmerUserId, farmerName: null as string | null, items }));
  }, [cart]);

  useEffect(() => {
    if (cartFingerprint !== lastCartFingerprintRef.current) {
      setCheckoutIdempotencyKey(createCheckoutIdempotencyKey());
      lastCartFingerprintRef.current = cartFingerprint;
    }
  }, [cartFingerprint]);

  const defaultAddress = useMemo(() => {
    const items = addressesQuery.data ?? [];
    return items.find((item) => item.isDefault) ?? items[0] ?? null;
  }, [addressesQuery.data]);

  useEffect(() => {
    if (selectedAddressId == null && defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [defaultAddress, selectedAddressId]);

  const selectedAddress = useMemo<MarketplaceAddress | null>(() => {
    if (!addressesQuery.data) {
      return null;
    }

    if (selectedAddressId == null) {
      return defaultAddress;
    }

    return (
      addressesQuery.data.find((item) => item.id === selectedAddressId) ??
      defaultAddress
    );
  }, [addressesQuery.data, defaultAddress, selectedAddressId]);

  // Dynamic shipping calculations
  const totalWeight = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity * 0.5, 0);
  }, [cart]);

  const requiresColdChain = useMemo(() => {
    if (!cart) return false;
    const keywords = ["rau", "củ", "quả", "thịt", "cá", "sữa", "fresh", "perishable", "tươi", "lạnh"];
    return cart.items.some((item) =>
      keywords.some((kw) => item.name.toLowerCase().includes(kw))
    );
  }, [cart]);

  const senderProvince = "Lâm Đồng";
  const recipientProvince = addressMode === "new" ? addressForm.province : selectedAddress?.province;

  const { data: shippingOptions, isLoading: isShippingLoading } = useQuery({
    queryKey: ["shippingOptions", senderProvince, recipientProvince, totalWeight, requiresColdChain, isGroupedDelivery],
    queryFn: () =>
      deliveryApi.calculate({
        senderProvince,
        recipientProvince: recipientProvince ?? "",
        weightKg: totalWeight,
        requiresColdChain,
        prefersSameDay: false,
        isGroupedDelivery,
        // Mock tọa độ nông trại và người mua để test tính phí theo bán kính Haversine
        senderLat: 11.9404, // Đà Lạt
        senderLon: 108.4583,
        recipientLat: recipientProvince === "Lâm Đồng" ? 11.9450 : 10.7626, // Cùng TP hoặc HCM
        recipientLon: recipientProvince === "Lâm Đồng" ? 108.4550 : 106.6601,
      }),
    enabled: !!recipientProvince && totalWeight > 0,
  });

  useEffect(() => {
    // Reset selected shipping option if cart changes
    setSelectedShippingOption(null);
  }, [cart]);

  useEffect(() => {
    if (shippingOptions && shippingOptions.length > 0) {
      const exists = shippingOptions.find(
        (o) => o.providerId === selectedShippingOption?.providerId && o.type === selectedShippingOption?.type
      );
      if (!exists) {
        setSelectedShippingOption(shippingOptions[0]);
      }
    } else {
      setSelectedShippingOption(null);
    }
  }, [shippingOptions]);

  const currentAddressMutation =
    editingAddressId == null ? createAddressMutation : updateAddressMutation;

  const addressMutationError =
    currentAddressMutation.error instanceof Error ? currentAddressMutation.error.message : null;
  const deleteAddressError =
    deleteAddressMutation.error instanceof Error ? deleteAddressMutation.error.message : null;
  const addressFormBaseline = useMemo(() => {
    const editingAddress = addressesQuery.data?.find((item) => item.id === editingAddressId);
    return editingAddress ? toAddressForm(editingAddress) : emptyAddressForm();
  }, [addressesQuery.data, editingAddressId]);
  const isAddressFormDirty =
    addressMode === "new" &&
    JSON.stringify(addressForm) !== JSON.stringify(addressFormBaseline);
  const isCheckoutDirty =
    isAddressFormDirty ||
    recipientName.trim().length > 0 ||
    phone.trim().length > 0 ||
    addressLine.trim().length > 0 ||
    note.trim().length > 0 ||
    paymentMethod !== "COD";
  const draftAddressLine = resolveDraftShippingAddressLine(addressForm);
  const effectiveRecipientName =
    recipientName.trim() ||
    (addressMode === "new" ? addressForm.fullName.trim() : selectedAddress?.fullName) ||
    undefined;
  const effectivePhone =
    phone.trim() ||
    (addressMode === "new" ? addressForm.phone.trim() : selectedAddress?.phone) ||
    undefined;
  const effectiveShippingAddressLine =
    addressMode === "new"
      ? addressLine.trim() || draftAddressLine
      : resolveShippingAddressLine(selectedAddress, addressLine);

  if (cartQuery.isLoading && !buyNowItem) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6">
        <BackButton to="/marketplace/cart" className="mb-4 w-fit" />
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("marketplaceBuyer.checkout.loadingCart")}
        </div>
      </div>
    );
  }

  if (cartQuery.isError && !buyNowItem) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6">
        <BackButton to="/marketplace/cart" className="mb-4 w-fit" />
        <div className="rounded-xl border border-dashed border-destructive/30 bg-card p-8 text-center text-sm text-destructive">
          {t("marketplaceBuyer.checkout.errorCart")}
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-[1800px] mx-auto px-6 pt-6">
        <BackButton to="/marketplace/cart" className="mb-4 w-fit" />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <h1 className="text-xl font-semibold text-foreground">{t("marketplaceBuyer.checkout.emptyCartTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("marketplaceBuyer.checkout.emptyCartDesc")}
          </p>
          <Button className="mt-4" onClick={() => navigate("/marketplace/cart")}>
            {t("marketplaceBuyer.checkout.backToCart")}
          </Button>
        </div>
      </div>
    );
  }

  const shippingFee = selectedShippingOption ? selectedShippingOption.shippingFeeVnd : 0;
  const total = cart.subtotal + shippingFee;
  const submitErrorMessage =
    createOrderMutation.error instanceof Error
      ? createOrderMutation.error.message
      : null;

  async function saveAddress() {
    setAddressFormMessage(null);
    if (!isAddressFormValid(addressForm)) {
      setAddressFormMessage(t("marketplaceBuyer.checkout.addressForm.validationError"));
      return;
    }

    const payload: MarketplaceAddressUpsertRequest = {
      ...addressForm,
      detail: addressForm.detail?.trim() || undefined,
    };

    try {
      const saved =
        editingAddressId == null
          ? await createAddressMutation.mutateAsync(payload)
          : await updateAddressMutation.mutateAsync({
              addressId: editingAddressId,
              request: payload,
            });

      toast.success('Đã lưu địa chỉ giao hàng.');
      setSelectedAddressId(saved.id);
      setAddressMode("saved");
      setEditingAddressId(null);
      setAddressForm(emptyAddressForm());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.');
    }
  }

  function closeAddressForm() {
    if (
      isAddressFormDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }

    setAddressMode("saved");
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm());
    setAddressFormMessage(null);
  }

  function startNewAddressForm() {
    if (
      isAddressFormDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }

    setAddressMode("new");
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm());
    setAddressFormMessage(null);
  }

  return (
    <div className="max-w-[1800px] mx-auto px-6 pt-6">
      <BackButton
        to={buyNowItem ? undefined : "/marketplace/cart"}
        onClick={buyNowItem ? () => navigate(-1) : undefined}
        confirmOnLeave={isCheckoutDirty}
        className="mb-4 w-fit"
      />
      <h1 className="mb-10 text-3xl font-bold text-foreground">{t("marketplaceBuyer.checkout.title")}</h1>

      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-8">
          <Card>
            <CardHeader className="border-b border-border/50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">{t("marketplaceBuyer.checkout.shippingAddressTitle")}</CardTitle>
                  <p className="mt-1.5 text-sm text-muted-foreground">{t("marketplaceBuyer.checkout.shippingAddressDesc")}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={addressMode === "saved" ? "default" : "outline"}
                    size="sm"
                    onClick={closeAddressForm}
                  >
                    {t("marketplaceBuyer.checkout.savedAddresses")}
                  </Button>
                  <Button
                    variant={addressMode === "new" ? "default" : "outline"}
                    size="sm"
                    onClick={startNewAddressForm}
                  >
                    <Plus size={16} />
                    {t("marketplaceBuyer.checkout.newAddress")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {addressMode === "saved" ? (
                <div className="space-y-4">
                  {addressesQuery.data && addressesQuery.data.length > 0 ? (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Chọn địa chỉ giao hàng</label>
                        <select
                          className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm shadow-sm transition-colors hover:border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={selectedAddress?.id ?? ""}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setSelectedAddressId(Number.isFinite(next) ? next : null);
                          }}
                        >
                          {addressesQuery.data.map((address) => (
                            <option key={address.id} value={address.id}>
                              {formatAddressLabel(address)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedAddress ? (
                        <div className="rounded-lg border-2 border-emerald-100 bg-emerald-50/30 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex-1 space-y-2.5">
                              <div className="flex items-center gap-2 text-foreground">
                                <User size={16} className="text-primary" />
                                <span className="font-semibold">{selectedAddress.fullName}</span>
                                {selectedAddress.isDefault ? (
                                  <span className="ml-1 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    {t("marketplaceBuyer.checkout.defaultBadge")}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone size={16} className="text-primary" />
                                <span>{selectedAddress.phone}</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                                <span className="leading-relaxed">
                                  {selectedAddress.street}
                                  {selectedAddress.detail ? `, ${selectedAddress.detail}` : ""}, {selectedAddress.ward}, {selectedAddress.province}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAddressMode("new");
                                  setEditingAddressId(selectedAddress.id);
                                  setAddressForm(toAddressForm(selectedAddress));
                                  setAddressFormMessage(null);
                                }}
                              >
                                <Pencil size={16} />
                                {t("marketplaceBuyer.checkout.editAddress")}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleteAddressMutation.isPending}
                                onClick={async () => {
                                  await deleteAddressMutation.mutateAsync(selectedAddress.id);
                                  setSelectedAddressId(null);
                                }}
                              >
                                <Trash2 size={16} />
                                {t("marketplaceBuyer.checkout.deleteAddress")}
                              </Button>
                            </div>
                          </div>
                          {deleteAddressError ? (
                            <p className="mt-3 text-sm text-destructive">{deleteAddressError}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                      {t("marketplaceBuyer.checkout.noSavedAddress")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5 rounded-lg border border-border bg-muted/50 p-5">
                  <BackButton
                    onClick={closeAddressForm}
                    className="w-fit"
                  />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t("marketplaceBuyer.checkout.addressForm.recipientName")}</label>
                      <Input
                        className="border-border"
                        value={addressForm.fullName}
                        onChange={(event) =>
                          setAddressForm((current) => ({ ...current, fullName: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t("marketplaceBuyer.checkout.addressForm.phone")}</label>
                      <Input
                        className="border-border"
                        value={addressForm.phone}
                        onChange={(event) =>
                          setAddressForm((current) => ({ ...current, phone: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t("marketplaceBuyer.checkout.addressForm.province")}</label>
                      <Input
                        className="border-border"
                        value={addressForm.province}
                        onChange={(event) =>
                          setAddressForm((current) => ({ ...current, province: event.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t("marketplaceBuyer.checkout.addressForm.ward")}</label>
                      <Input
                        className="border-border"
                        value={addressForm.ward}
                        onChange={(event) =>
                          setAddressForm((current) => ({ ...current, ward: event.target.value, district: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t("marketplaceBuyer.checkout.addressForm.street")}</label>
                      <Input
                        className="border-border"
                        value={addressForm.street}
                        onChange={(event) =>
                          setAddressForm((current) => ({ ...current, street: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t("marketplaceBuyer.checkout.addressForm.detail")}</label>
                    <Input
                      className="border-border"
                      placeholder="Số nhà, tên tòa nhà, v.v."
                      value={addressForm.detail ?? ""}
                      onChange={(event) =>
                        setAddressForm((current) => ({ ...current, detail: event.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Loại địa chỉ</label>
                      <select
                        value={addressForm.label ?? "home"}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            label: event.target.value as MarketplaceAddress["label"],
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm shadow-sm transition-colors hover:border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="home">{t("marketplaceBuyer.checkout.addressForm.labelHome")}</option>
                        <option value="office">{t("marketplaceBuyer.checkout.addressForm.labelOffice")}</option>
                        <option value="other">{t("marketplaceBuyer.checkout.addressForm.labelOther")}</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2.5 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault ?? false}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            isDefault: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      {t("marketplaceBuyer.checkout.addressForm.setDefault")}
                    </label>
                  </div>

                  {addressFormMessage ? <p className="text-sm text-destructive">{addressFormMessage}</p> : null}
                  {addressMutationError ? <p className="text-sm text-destructive">{addressMutationError}</p> : null}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button disabled={currentAddressMutation.isPending} onClick={saveAddress}>
                      {currentAddressMutation.isPending
                        ? t("marketplaceBuyer.checkout.addressForm.saving")
                        : editingAddressId == null
                          ? t("marketplaceBuyer.checkout.addressForm.saveAddress")
                          : t("marketplaceBuyer.checkout.addressForm.updateAddress")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={closeAddressForm}
                    >
                      {t("marketplaceBuyer.checkout.addressForm.cancel")}
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-dashed border-border bg-muted/50/50 p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground/60">{t("marketplaceBuyer.checkout.overrideSection")}</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    placeholder={t("marketplaceBuyer.checkout.recipientOverride")}
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    className="border-border bg-card"
                  />
                  <Input
                    placeholder={t("marketplaceBuyer.checkout.phoneOverride")}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="border-border bg-card"
                  />
                </div>
                <Input
                  className="mt-3 border-border bg-card"
                  placeholder={t("marketplaceBuyer.checkout.addressOverride")}
                  value={addressLine}
                  onChange={(event) => setAddressLine(event.target.value)}
                />
              </div>

              {/* Delivery Schedule Options */}
              <div className="space-y-3 pt-2">
                <label className="block text-sm font-medium text-foreground">Thời gian nhận hàng</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div
                    onClick={() => setIsGroupedDelivery(false)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all",
                      !isGroupedDelivery ? "border-primary bg-primary/5" : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    <div>
                      <div className="font-semibold text-foreground">Giao hàng tiêu chuẩn</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Nhận hàng ngay khi có thể</div>
                    </div>
                  </div>
                  
                  <div
                    onClick={() => setIsGroupedDelivery(true)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all relative overflow-hidden",
                      isGroupedDelivery ? "border-emerald-500 bg-emerald-500/5" : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                      Giảm 30% phí
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-emerald-700">Hẹn lịch cuối tuần</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Gom đơn - Tiết kiệm chi phí ship</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Options Selector */}
              {isShippingLoading && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground animate-pulse">
                  Đang tính toán phí vận chuyển...
                </div>
              )}

              {recipientProvince && !isShippingLoading && (!shippingOptions || shippingOptions.length === 0) && (
                <div className="rounded-lg border border-dashed border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
                  Không tìm thấy đơn vị vận chuyển phù hợp cho tuyến đường này.
                </div>
              )}

              {shippingOptions && shippingOptions.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">Phương thức vận chuyển</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {shippingOptions.map((option) => {
                      const isSelected =
                        selectedShippingOption?.providerId === option.providerId &&
                        selectedShippingOption?.type === option.type;
                      return (
                        <div
                          key={`${option.providerId}-${option.type}`}
                          onClick={() => setSelectedShippingOption(option)}
                          className={cn(
                            "flex cursor-pointer flex-col gap-1.5 rounded-lg border-2 p-4 transition-all duration-200",
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                              : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{option.providerName}</span>
                            <span className="text-sm font-bold text-primary">{formatVnd(option.shippingFeeVnd)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded bg-muted px-1.5 py-0.5 capitalize">
                              {option.type === "same_day" ? "Giao trong ngày" : "Giao hàng tiêu chuẩn"}
                            </span>
                            {option.isColdChain && (
                              <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5">
                                Chuỗi lạnh (Cold chain)
                              </span>
                            )}
                            <span>Dự kiến: {option.estimatedHours}h</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Loại đơn hàng</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <label
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors",
                      deliverySchedule === "one-time"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-border bg-card hover:bg-muted"
                    )}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      checked={deliverySchedule === "one-time"}
                      onChange={() => setDeliverySchedule("one-time")}
                    />
                    <span className="font-medium text-sm">Giao 1 lần</span>
                  </label>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors",
                      deliverySchedule === "weekly"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-border bg-card hover:bg-muted"
                    )}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      checked={deliverySchedule === "weekly"}
                      onChange={() => setDeliverySchedule("weekly")}
                    />
                    <span className="font-medium text-sm">Giao hàng tuần</span>
                  </label>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors",
                      deliverySchedule === "monthly"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-border bg-card hover:bg-muted"
                    )}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      checked={deliverySchedule === "monthly"}
                      onChange={() => setDeliverySchedule("monthly")}
                    />
                    <span className="font-medium text-sm">Giao hàng tháng</span>
                  </label>
                </div>

                {deliverySchedule !== "one-time" && (
                  <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <label className="mb-2 block text-sm font-medium text-emerald-800">
                      {deliverySchedule === "weekly" ? "Chọn thứ giao hàng" : "Chọn ngày giao hàng trong tháng"}
                    </label>
                    <Input
                      className="border-emerald-200 bg-white placeholder:text-emerald-300"
                      placeholder={deliverySchedule === "weekly" ? "VD: Thứ 2 và Thứ 5" : "VD: Ngày 15 và 30"}
                      value={deliveryDay}
                      onChange={(event) => setDeliveryDay(event.target.value)}
                    />
                    <p className="text-xs text-emerald-600 mt-2">
                      Đơn hàng sẽ được tự động tạo và gửi đến Nông trại vào trước ngày giao hàng.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Ghi chú</label>
                <Input
                  className="border-border"
                  placeholder={t("marketplaceBuyer.checkout.orderNote")}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-lg font-semibold text-foreground">{t("marketplaceBuyer.checkout.paymentMethodTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-4 rounded-lg border-2 p-5 transition-all duration-200",
                  paymentMethod === "COD"
                    ? "border-emerald-600 bg-emerald-100 shadow-md"
                    : "border-border bg-card hover:border-border hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="marketplace-payment"
                  className="mt-1 h-4 w-4 shrink-0 border-border text-primary focus:ring-2 focus:ring-primary/20"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                />
                <div className="flex flex-1 items-start gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2.5">
                    <Banknote size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="block text-base font-semibold text-foreground">{t("marketplaceBuyer.checkout.codLabel")}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{t("marketplaceBuyer.checkout.codDesc")}</span>
                  </div>
                </div>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-4 rounded-lg border-2 p-5 transition-all duration-200",
                  paymentMethod === "BANK_TRANSFER"
                    ? "border-emerald-600 bg-emerald-100 shadow-md"
                    : "border-border bg-card hover:border-border hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="marketplace-payment"
                  className="mt-1 h-4 w-4 shrink-0 border-border text-primary focus:ring-2 focus:ring-primary/20"
                  checked={paymentMethod === "BANK_TRANSFER"}
                  onChange={() => setPaymentMethod("BANK_TRANSFER")}
                />
                <div className="flex flex-1 items-start gap-3">
                  <div className="rounded-lg bg-blue-100 p-2.5">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <span className="block text-base font-semibold text-foreground">{t("marketplaceBuyer.checkout.bankTransferLabel")}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{t("marketplaceBuyer.checkout.bankTransferDesc")}</span>
                  </div>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="w-full shrink-0 lg:w-96">
          <Card className="sticky top-24 border-2 border-border shadow-lg">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-lg font-semibold text-foreground">{t("marketplaceBuyer.checkout.orderSummaryTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex items-start justify-between gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="block font-medium text-foreground line-clamp-2">{item.name}</span>
                      <span className="mt-1 text-muted-foreground">
                        {item.quantity} x {formatVnd(item.unitPrice)}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground shrink-0">{formatVnd(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="mb-6 space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("marketplaceBuyer.checkout.subtotal")}</span>
                  <span className="font-medium text-foreground">{formatVnd(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("marketplaceBuyer.checkout.shipping")}</span>
                  <span className="font-medium text-foreground">{formatVnd(shippingFee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-base font-bold text-foreground">{t("marketplaceBuyer.checkout.total")}</span>
                  <span className="text-2xl font-bold text-primary">{formatVnd(total)}</span>
                </div>
              </div>

              {effectiveRecipientName && effectivePhone && effectiveShippingAddressLine ? (
                <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    <p className="text-sm font-semibold text-foreground">{t("marketplaceBuyer.checkout.deliverTo")}</p>
                  </div>
                  <div className="space-y-1 text-sm text-foreground">
                    <p className="font-medium">{effectiveRecipientName}</p>
                    <p>{effectivePhone}</p>
                    <p className="text-muted-foreground">{effectiveShippingAddressLine}</p>
                  </div>
                </div>
              ) : null}

              {splitOrderGroups.length > 1 ? (
                <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Đơn hàng sẽ được tách theo người bán</p>
                  <div className="mt-3 space-y-2">
                    {splitOrderGroups.map((group, index) => (
                      <div key={group.farmerUserId} className="rounded-lg bg-card p-3 text-sm text-foreground">
                        <div className="font-medium text-foreground">
                          Đơn {index + 1}{group.farmerName ? ` — ${group.farmerName}` : ''}
                        </div>
                        <div>{group.items.length} sản phẩm · {formatVnd(group.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {submitErrorMessage ? (
                <p className="mb-4 text-sm text-destructive">{submitErrorMessage}</p>
              ) : null}

              <Button
                type="button"
                className="w-full"
                size="lg"
                disabled={
                  createOrderMutation.isPending ||
                  !effectiveRecipientName ||
                  !effectivePhone ||
                  !effectiveShippingAddressLine
                }
                onClick={async () => {
                  const validation = validateCheckout({
                    addressMode,
                    selectedAddress,
                    recipientName: effectiveRecipientName,
                    phone: effectivePhone,
                    shippingAddressLine: effectiveShippingAddressLine ?? '',
                    paymentMethod,
                  });
                  if (!validation.valid) {
                    toast.error(validation.message);
                    return;
                  }

                  try {
                    const result = await createOrderMutation.mutateAsync({
                      paymentMethod,
                      addressId: addressMode === "saved" ? selectedAddress?.id : undefined,
                      shippingRecipientName: effectiveRecipientName,
                      shippingPhone: effectivePhone,
                      shippingAddressLine: effectiveShippingAddressLine ?? '',
                      note: note.trim() || undefined,
                      idempotencyKey: checkoutIdempotencyKey,
                      items: buyNowItem ? [{ productId: buyNowItem.productId, quantity: buyNowItem.quantity }] : undefined,
                    });

                    // Register delivery orders for each split order
                    if (selectedShippingOption && result.orders && result.orders.length > 0) {
                      for (const order of result.orders) {
                        try {
                          await deliveryApi.createDeliveryOrder({
                            marketplaceOrderId: order.id,
                            providerId: selectedShippingOption.providerId,
                            shippingFeeVnd: selectedShippingOption.shippingFeeVnd,
                            isPerishable: requiresColdChain,
                            requiresColdChain: requiresColdChain,
                            recipientName: effectiveRecipientName ?? '',
                            recipientPhone: effectivePhone ?? '',
                            recipientAddress: effectiveShippingAddressLine ?? '',
                            recipientProvince: recipientProvince ?? '',
                            weightKg: totalWeight,
                          });
                        } catch (err) {
                          console.error("Failed to register delivery order in delivery-service", err);
                        }
                      }
                    }

                    toast.success('Đặt hàng thành công.');
                    const firstOrderId = result.orders[0]?.id;
                    if (firstOrderId) {
                      navigate(`/marketplace/orders/${firstOrderId}`);
                      return;
                    }
                    navigate("/marketplace/orders");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.');
                  }
                }}
              >
                {createOrderMutation.isPending
                  ? t("marketplaceBuyer.checkout.placingOrder")
                  : t("marketplaceBuyer.checkout.placeOrder")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
