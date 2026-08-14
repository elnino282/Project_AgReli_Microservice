import type { MarketplaceApiResponse } from "./contracts";
import type {
  MarketplaceAddress,
  MarketplaceAdminOrderQuery,
  MarketplaceAdminProductQuery,
  MarketplaceAdminStats,
  MarketplaceAddressUpsertRequest,
  MarketplaceAddCartItemRequest,
  MarketplaceCart,
  MarketplaceCreateOrderRequest,
  MarketplaceCreateOrderResult,
  MarketplaceShippingQuoteGroup,
  MarketplaceCreateReviewRequest,
  MarketplaceFarmerDashboard,
  MarketplaceFarmerOrderQuery,
  MarketplaceFarmerProductFormOptions,
  MarketplaceFarmerProductQuery,
  MarketplaceFarmerProductUpsertRequest,
  MarketplaceFarmDetail,
  MarketplaceFarmPage,
  MarketplaceFarmQuery,
  MarketplaceImageSearchAnalysis,
  MarketplaceImageSearchFilters,
  MarketplaceImageSearchResult,
  MarketplaceMergeCartRequest,
  MarketplaceOrder,
  MarketplaceOrderAuditLog,
  MarketplaceOrderPage,
  MarketplaceOrderQuery,
  MarketplaceProductDetail,
  MarketplaceProductImageUploadResponse,
  MarketplaceProductPage,
  MarketplaceProductQuery,
  MarketplaceReview,
  MarketplaceReviewPage,
  MarketplaceReviewQuery,
  MarketplaceTraceability,
  MarketplaceUpdateOrderStatusRequest,
  MarketplaceUpdatePaymentVerificationRequest,
  MarketplaceUpdateProductStatusRequest,
  MarketplaceUpdateCartItemRequest,
} from "./types";

export interface MarketplaceApiAdapter {
  listProducts(
    query?: MarketplaceProductQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceProductPage>>;

  analyzeMarketplaceImage(
    file: File,
  ): Promise<MarketplaceApiResponse<MarketplaceImageSearchAnalysis>>;

  searchMarketplaceByImage(
    file: File,
    filters?: MarketplaceImageSearchFilters,
  ): Promise<MarketplaceApiResponse<MarketplaceImageSearchResult>>;

  getProductBySlug(
    slug: string,
  ): Promise<MarketplaceApiResponse<MarketplaceProductDetail>>;

  listProductReviews(
    productId: number,
    query?: MarketplaceReviewQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceReviewPage>>;

  listFarmReviews(
    farmId: number,
    query?: MarketplaceReviewQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceReviewPage>>;

  listFarms(
    query?: MarketplaceFarmQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceFarmPage>>;

  getFarmDetail(
    farmId: number,
  ): Promise<MarketplaceApiResponse<MarketplaceFarmDetail>>;

  getTraceability(
    productId: number,
  ): Promise<MarketplaceApiResponse<MarketplaceTraceability>>;

  getPublicTraceability(
    productIdOrSlug: string,
  ): Promise<MarketplaceApiResponse<MarketplaceTraceability>>;

  getCart(): Promise<MarketplaceApiResponse<MarketplaceCart>>;

  addCartItem(
    request: MarketplaceAddCartItemRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceCart>>;

  updateCartItem(
    productId: number,
    request: MarketplaceUpdateCartItemRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceCart>>;

  removeCartItem(productId: number): Promise<MarketplaceApiResponse<MarketplaceCart>>;

  mergeCart(
    request: MarketplaceMergeCartRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceCart>>;

  createOrder(
    request: MarketplaceCreateOrderRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceCreateOrderResult>>;

  createShippingQuotes(request: {
    addressId?: number;
    recipientProvince: string;
    items?: Array<{ productId: number; quantity: number }>;
  }): Promise<MarketplaceApiResponse<MarketplaceShippingQuoteGroup[]>>;

  listOrders(
    query?: MarketplaceOrderQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceOrderPage>>;

  getOrderDetail(orderId: number): Promise<MarketplaceApiResponse<MarketplaceOrder>>;

  cancelOrder(orderId: number): Promise<MarketplaceApiResponse<MarketplaceOrder>>;

  uploadOrderPaymentProof(
    orderId: number,
    file: File,
  ): Promise<MarketplaceApiResponse<MarketplaceOrder>>;

  listAddresses(): Promise<MarketplaceApiResponse<MarketplaceAddress[]>>;

  createAddress(
    request: MarketplaceAddressUpsertRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceAddress>>;

  updateAddress(
    addressId: number,
    request: MarketplaceAddressUpsertRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceAddress>>;

  deleteAddress(addressId: number): Promise<MarketplaceApiResponse<null>>;

  createReview(
    request: MarketplaceCreateReviewRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceReview>>;

  getFarmerDashboard(): Promise<MarketplaceApiResponse<MarketplaceFarmerDashboard>>;

  listFarmerProducts(
    query?: MarketplaceFarmerProductQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceProductPage>>;

  getFarmerProductFormOptions(): Promise<MarketplaceApiResponse<MarketplaceFarmerProductFormOptions>>;

  getFarmerProductDetail(
    productId: number,
  ): Promise<MarketplaceApiResponse<MarketplaceProductDetail>>;

  createFarmerProduct(
    request: MarketplaceFarmerProductUpsertRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceProductDetail>>;

  uploadFarmerProductImage(
    file: File,
  ): Promise<MarketplaceApiResponse<MarketplaceProductImageUploadResponse>>;

  updateFarmerProduct(
    productId: number,
    request: MarketplaceFarmerProductUpsertRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceProductDetail>>;

  updateFarmerProductStatus(
    productId: number,
    request: MarketplaceUpdateProductStatusRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceProductDetail>>;

  listFarmerOrders(
    query?: MarketplaceFarmerOrderQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceOrderPage>>;

  getFarmerOrderDetail(orderId: number): Promise<MarketplaceApiResponse<MarketplaceOrder>>;

  updateFarmerOrderStatus(
    orderId: number,
    request: MarketplaceUpdateOrderStatusRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceOrder>>;

  listAdminProducts(
    query?: MarketplaceAdminProductQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceProductPage>>;

  getAdminProductDetail(
    productId: number,
  ): Promise<MarketplaceApiResponse<MarketplaceProductDetail>>;

  updateAdminProductStatus(
    productId: number,
    request: MarketplaceUpdateProductStatusRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceProductDetail>>;

  listAdminOrders(
    query?: MarketplaceAdminOrderQuery,
  ): Promise<MarketplaceApiResponse<MarketplaceOrderPage>>;

  getAdminOrderDetail(orderId: number): Promise<MarketplaceApiResponse<MarketplaceOrder>>;

  updateAdminOrderPaymentVerification(
    orderId: number,
    request: MarketplaceUpdatePaymentVerificationRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceOrder>>;

  updateAdminOrderStatus(
    orderId: number,
    request: MarketplaceUpdateOrderStatusRequest,
  ): Promise<MarketplaceApiResponse<MarketplaceOrder>>;

  listAdminOrderAuditLogs(
    orderId: number,
  ): Promise<MarketplaceApiResponse<MarketplaceOrderAuditLog[]>>;

  getAdminStats(): Promise<MarketplaceApiResponse<MarketplaceAdminStats>>;
}
