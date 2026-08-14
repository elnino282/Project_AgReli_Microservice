import type { MarketplacePage } from "./contracts";

export type MarketplaceProductStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "REJECTED"
  | "INACTIVE"
  | "SOLD_OUT"
  | "PUBLISHED"
  | "HIDDEN";

export type MarketplaceOrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_SUBMITTED"
  | "PAYMENT_VERIFIED"
  | "CONFIRMED"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  // Legacy compatibility aliases (old fixtures / migrated records).
  | "PENDING"
  | "DELIVERING";

export type MarketplacePaymentMethod = "COD" | "BANK_TRANSFER";
export type MarketplacePaymentVerificationStatus =
  | "NOT_REQUIRED"
  | "AWAITING_PROOF"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export type MarketplaceProductSummary = {
  id: number;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  price: number;
  unit: string;
  stockQuantity: number;
  availableQuantity: number;
  shippingWeightKgPerUnit?: number | null;
  perishable?: boolean;
  requiresColdChain?: boolean;
  imageUrl: string;
  farmerUserId: number;
  farmerDisplayName: string;
  farmId: number | null;
  farmName: string | null;
  seasonId: number | null;
  seasonName: string | null;
  lotId: number | null;
  region: string | null;
  traceable: boolean;
  ratingAverage: number;
  ratingCount: number;
  status: MarketplaceProductStatus;
  statusReason?: string | null;
  rejectionReason?: string | null;
  publishedAt: string | null;
  statusChangedAt: string | null;
  approvalEligible: boolean;
  approvalBlockers: string[];
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceProductDetail = MarketplaceProductSummary & {
  description: string;
  imageUrls: string[];
  traceabilityCode: string | null;
};

export type MarketplaceProductImageUploadResponse = {
  url: string;
  fileName: string;
  contentType: string;
  size: number;
};

export type MarketplaceFarmSummary = {
  id: number;
  name: string;
  region: string | null;
  address: string | null;
  coverImageUrl: string | null;
  productCount: number;
  active: boolean;
  ratingAverage: number;
  ratingCount: number;
  hasTraceableProducts: boolean;
};

export type MarketplaceFarmDetail = MarketplaceFarmSummary & {
  description: string | null;
  ownerUserId: number;
  ownerDisplayName: string | null;
  contactPhone: string | null;
};

export type MarketplaceTraceability = {
  productId: number;
  traceable: boolean;
  farm: {
    id: number;
    name: string;
    region: string | null;
    address: string | null;
  } | null;
  season: {
    id: number;
    name: string;
    startDate: string | null;
    plannedHarvestDate: string | null;
    cropName?: string | null;
    varietyName?: string | null;
    plantingDate?: string | null;
    harvestDate?: string | null;
  } | null;
  lot?: {
    id: number;
    lotCode: string;
    harvestedAt: string | null;
    unit: string | null;
    initialQuantity: number | null;
  } | null;
  productLot?: {
    id: number;
    lotCode: string;
    harvestedAt: string | null;
    receivedAt?: string | null;
    unit: string | null;
    initialQuantity: number | null;
    grade?: string | null;
    warehouseName?: string | null;
    storageLocation?: string | null;
  } | null;
  plot?: {
    id: number;
    name: string;
    area: number;
  } | null;
  harvest?: {
    id: number;
    harvestDate: string | null;
    quantity: number;
    qualityNotes: string | null;
  } | null;
  timeline?: Array<{
    milestone: string;
    date: string;
    description: string;
  }> | null;
  validatedAt: string;
  certification?: {
    certificationName: string;
    certificationType: string;
    status: string;
    issuedDate: string | null;
    expiryDate: string | null;
    complianceScore: number;
  } | null;
  phiSafety?: {
    safe: boolean;
    totalPesticidesUsed: number;
    safePesticides: number;
    cautionPesticides: number;
    pesticideUsage: Array<{
      pesticideName: string;
      applicationDate: string;
      harvestAllowedDate: string;
      status: "SAFE" | "CAUTION" | "BLOCKED";
    }>;
  } | null;
  nutritionClaim?: {
    soilOrganicMatter: string;
    soilPH: string;
    nitrogenLevel: string;
  } | null;
};

export type MarketplaceReview = {
  id: number;
  productId: number;
  orderId: number;
  orderItemId: number;
  buyerUserId: number;
  buyerDisplayName: string;
  rating: number;
  comment: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceCartItem = {
  productId: number;
  slug: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  farmerUserId: number;
  traceable: boolean;
};

export type MarketplaceCartSellerGroup = {
  farmerUserId: number;
  farmerName: string | null;
  farmId: number | null;
  farmName: string | null;
  items: MarketplaceCartItem[];
  subtotal: number;
};

export type MarketplaceCart = {
  userId: number;
  items: MarketplaceCartItem[];
  sellerGroups: MarketplaceCartSellerGroup[];
  itemCount: number;
  subtotal: number;
  currency: "VND";
};

export type MarketplaceAddress = {
  id: number;
  userId: number;
  fullName: string;
  phone: string;
  province: string;
  /** @deprecated Backend requires this field but has no district data. Auto-filled with ward value. */
  district: string;
  ward: string;
  street: string;
  detail: string | null;
  label: "home" | "office" | "other";
  isDefault: boolean;
};

export type MarketplaceOrderItem = {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  imageUrl: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
  traceableSnapshot: boolean;
  canReview: boolean;
  reviewId: number | null;
};

export type MarketplaceOrderPayment = {
  method: MarketplacePaymentMethod;
  verificationStatus: MarketplacePaymentVerificationStatus;
  proofFileName: string | null;
  proofContentType: string | null;
  proofStoragePath: string | null;
  proofUploadedAt: string | null;
  verifiedAt: string | null;
  verifiedBy: number | null;
  verificationNote: string | null;
};

export type MarketplaceOrder = {
  id: number;
  orderCode: string;
  orderGroupCode: string;
  buyerUserId: number;
  farmerUserId: number;
  status: MarketplaceOrderStatus;
  payment: MarketplaceOrderPayment;
  shippingRecipientName: string;
  shippingPhone: string;
  shippingAddressLine: string;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  canCancel: boolean;
  createdAt: string;
  updatedAt: string;
  items: MarketplaceOrderItem[];
};

export type MarketplaceOrderAuditLog = {
  id: number;
  entityType: string;
  entityId: number;
  operation: string;
  performedBy: string;
  performedAt: string;
  snapshotDataJson: string | null;
  reason: string | null;
  ipAddress: string | null;
};

export type MarketplaceCreateOrderResult = {
  orderGroupId: number;
  orderIds: number[];
  totalAmount: number;
  currency: string;
  message: string;
  nextStep: string | null;
  orderShippingQuotes: Array<{
    orderId: number;
    shippingQuoteId: string;
  }>;
};

export type MarketplaceShippingQuoteGroup = {
  sellerUserId: number;
  farmId: number;
  farmName: string | null;
  senderProvince: string;
  weightKg: number;
  perishable: boolean;
  requiresColdChain: boolean;
  options: Array<{
    quoteId: string;
    providerId: number;
    providerName: string;
    serviceType: "standard" | "same_day";
    shippingFeeVnd: number;
    estimatedHours: number;
    expiresAt: string;
  }>;
};

export type MarketplaceProductQuery = {
  page?: number;
  size?: number;
  farmId?: number;
  category?: string;
  q?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  traceable?: boolean;
};

export type MarketplaceImageSearchAnalysis = {
  detectedProduct: string | null;
  category: string | null;
  keywordsVi: string[];
  keywordsEn: string[];
  keywords: string[];
  visualAttributes: string[];
  confidence: number;
  confidenceLabel: "low" | "medium" | "high" | string;
  agricultural: boolean;
  message: string | null;
};

export type MarketplaceImageSearchFilters = Pick<
  MarketplaceProductQuery,
  "region" | "traceable" | "minPrice" | "maxPrice" | "sort" | "page" | "size"
>;

export type MarketplaceImageSearchResult = {
  analysis: MarketplaceImageSearchAnalysis;
  products: MarketplaceProductPage;
  searchKeywords: string[];
  imageHash: string;
};

export type MarketplaceFarmQuery = {
  page?: number;
  size?: number;
  q?: string;
  region?: string;
};

export type MarketplaceOrderQuery = {
  page?: number;
  size?: number;
  status?: MarketplaceOrderStatus;
};

export type MarketplaceReviewQuery = {
  page?: number;
  size?: number;
};

export type MarketplaceFarmerProductQuery = {
  page?: number;
  size?: number;
  q?: string;
  status?: MarketplaceProductStatus;
};

export type MarketplaceAdminProductQuery = MarketplaceFarmerProductQuery;
export type MarketplaceFarmerOrderQuery = MarketplaceOrderQuery;
export type MarketplaceAdminOrderQuery = MarketplaceOrderQuery;

export type MarketplaceAddCartItemRequest = {
  productId: number;
  quantity: number;
};

export type MarketplaceUpdateCartItemRequest = {
  quantity: number;
};

export type MarketplaceMergeCartRequest = {
  items: Array<{
    productId: number;
    quantity: number;
  }>;
};

export type MarketplaceCreateOrderRequest = {
  paymentMethod: MarketplacePaymentMethod;
  addressId?: number;
  shippingRecipientName?: string;
  shippingPhone?: string;
  shippingAddressLine?: string;
  shippingProvince: string;
  note?: string;
  idempotencyKey: string;
  items?: Array<{
    productId: number;
    quantity: number;
  }>;
  shippingQuotes: Array<{
    sellerUserId: number;
    farmId: number;
    quoteId: string;
  }>;
};

export type MarketplaceAddressUpsertRequest = {
  fullName: string;
  phone: string;
  province: string;
  /** @deprecated Backend requires this field but has no district data. Auto-filled with ward value. */
  district: string;
  ward: string;
  street: string;
  detail?: string;
  label?: "home" | "office" | "other";
  isDefault?: boolean;
};

export type MarketplaceCreateReviewRequest = {
  orderId: number;
  orderItemId: number;
  rating: number;
  comment: string;
};

export type MarketplaceFarmerProductUpsertRequest = {
  name: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  price: number;
  stockQuantity: number;
  shippingWeightKgPerUnit: number;
  perishable: boolean;
  requiresColdChain: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  lotId: number;
};

export type MarketplaceFarmerProductFormFarmOption = {
  id: number;
  name: string;
};

export type MarketplaceFarmerProductFormSeasonOption = {
  id: number;
  seasonName: string;
  farmId: number | null;
};

export type MarketplaceFarmerProductFormLotOption = {
  id: number;
  lotCode: string;
  farmId: number | null;
  farmName: string | null;
  seasonId: number | null;
  seasonName: string | null;
  availableQuantity: number;
  harvestedAt: string | null;
  unit: string | null;
  productName: string | null;
  productVariant: string | null;
  linkedProductId: number | null;
  linkedProductStatus: MarketplaceProductStatus | null;
};

export type MarketplaceFarmerProductFormOptions = {
  farms: MarketplaceFarmerProductFormFarmOption[];
  seasons: MarketplaceFarmerProductFormSeasonOption[];
  lots: MarketplaceFarmerProductFormLotOption[];
};

export type MarketplaceUpdateProductStatusRequest = {
  status: MarketplaceProductStatus;
  statusReason?: string;
};

export type MarketplaceUpdateOrderStatusRequest = {
  status: MarketplaceOrderStatus;
  reason?: string;
};

export type MarketplaceUpdatePaymentVerificationRequest = {
  verificationStatus: MarketplacePaymentVerificationStatus;
  verificationNote?: string;
};

export type MarketplaceStatsUnavailableReason =
  | "NO_PRODUCTS"
  | "NO_ORDERS"
  | "NO_REVENUE_DATA"
  | "NO_COMPLETED_ORDERS";

export type MarketplaceFarmerDashboard = {
  totalProducts: number;
  pendingReviewProducts: number;
  publishedProducts: number;
  lowStockProducts: number;
  pendingOrders: number;
  totalRevenue: number | null;
  hasProducts: boolean;
  hasOrders: boolean;
  hasRevenueData: boolean;
  lastOrderAt: string | null;
  unavailableReasons: MarketplaceStatsUnavailableReason[];
  recentOrders: MarketplaceOrder[];
};

export type MarketplaceAdminStats = {
  totalProducts: number;
  pendingReviewProducts: number;
  publishedProducts: number;
  hiddenProducts: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingPaymentVerificationOrders: number;
  totalRevenue: number | null;
  hasProducts: boolean;
  hasOrders: boolean;
  hasRevenueData: boolean;
  lastOrderAt: string | null;
  unavailableReasons: MarketplaceStatsUnavailableReason[];
};

export type MarketplaceProductPage = MarketplacePage<MarketplaceProductSummary>;
export type MarketplaceFarmPage = MarketplacePage<MarketplaceFarmSummary>;
export type MarketplaceOrderPage = MarketplacePage<MarketplaceOrder>;
export type MarketplaceReviewPage = MarketplacePage<MarketplaceReview>;
