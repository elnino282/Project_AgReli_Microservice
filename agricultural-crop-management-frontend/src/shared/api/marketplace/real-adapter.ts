import httpClient from '../http';
import type { MarketplaceApiAdapter } from './adapter';
import {
  MARKETPLACE_API_PREFIX,
  assertMarketplaceDashboardContract,
  parseMarketplaceEnvelope,
  toMarketplaceClientError,
  type MarketplaceApiResponse,
} from './contracts';
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
  MarketplaceOrderStatus,
  MarketplaceProductDetail,
  MarketplaceProductImageUploadResponse,
  MarketplaceProductPage,
  MarketplaceProductQuery,
  MarketplaceProductStatus,
  MarketplaceReview,
  MarketplaceReviewPage,
  MarketplaceReviewQuery,
  MarketplaceTraceability,
  MarketplaceUpdateOrderStatusRequest,
  MarketplaceUpdatePaymentVerificationRequest,
  MarketplaceUpdateProductStatusRequest,
  MarketplaceUpdateCartItemRequest,
} from './types';

const BUYER_MARKETPLACE_IMAGE_SEARCH_PREFIX = "/api/v1/buyer/marketplace/image-search";

async function requestEnvelope<T>(
  execute: () => Promise<{ data: unknown }>,
): Promise<MarketplaceApiResponse<T>> {
  try {
    const response = await execute();
    return parseMarketplaceEnvelope<T>(response.data);
  } catch (error) {
    throw toMarketplaceClientError(error);
  }
}

function normalizeOrderStatus(status?: MarketplaceOrderStatus): MarketplaceOrderStatus | undefined {
  if (status === "PENDING") {
    return "PENDING_PAYMENT";
  }

  if (status === "DELIVERING") {
    return "SHIPPED";
  }

  return status;
}

function normalizeProductStatus(status?: MarketplaceProductStatus): MarketplaceProductStatus | undefined {
  if (status === "PUBLISHED") {
    return "ACTIVE";
  }

  if (status === "HIDDEN") {
    return "INACTIVE";
  }

  return status;
}

function buildImageSearchFormData(
  file: File,
  filters?: MarketplaceImageSearchFilters,
): FormData {
  const formData = new FormData();
  formData.append("file", file);

  if (!filters) {
    return formData;
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });

  return formData;
}

export function createMarketplaceRealAdapter(): MarketplaceApiAdapter {
  return {
    listProducts(query?: MarketplaceProductQuery) {
      return requestEnvelope<MarketplaceProductPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/products`, {
          params: query,
        }),
      );
    },

    analyzeMarketplaceImage(file: File) {
      const formData = new FormData();
      formData.append("file", file);
      return requestEnvelope<MarketplaceImageSearchAnalysis>(() =>
        httpClient.post(`${BUYER_MARKETPLACE_IMAGE_SEARCH_PREFIX}/analyze`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }),
      );
    },

    searchMarketplaceByImage(file: File, filters?: MarketplaceImageSearchFilters) {
      return requestEnvelope<MarketplaceImageSearchResult>(() =>
        httpClient.post(
          BUYER_MARKETPLACE_IMAGE_SEARCH_PREFIX,
          buildImageSearchFormData(file, filters),
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        ),
      );
    },

    getProductBySlug(slug: string) {
      return requestEnvelope<MarketplaceProductDetail>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/products/${encodeURIComponent(slug)}`),
      );
    },

    listProductReviews(productId: number, query?: MarketplaceReviewQuery) {
      return requestEnvelope<MarketplaceReviewPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/products/${productId}/reviews`, {
          params: query,
        }),
      );
    },

    listFarmReviews(farmId: number, query?: MarketplaceReviewQuery) {
      return requestEnvelope<MarketplaceReviewPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farms/${farmId}/reviews`, {
          params: query,
        }),
      );
    },

    listFarms(query?: MarketplaceFarmQuery) {
      return requestEnvelope<MarketplaceFarmPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farms`, { params: query }),
      );
    },

    getFarmDetail(farmId: number) {
      return requestEnvelope<MarketplaceFarmDetail>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farms/${farmId}`),
      );
    },

    getTraceability(productId: number) {
      return requestEnvelope<MarketplaceTraceability>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/products/${productId}/traceability`),
      );
    },

    getPublicTraceability(productIdOrSlug: string) {
      return requestEnvelope<MarketplaceTraceability>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/products/${productIdOrSlug}/public-trace`),
      );
    },

    getCart() {
      return requestEnvelope<MarketplaceCart>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/cart`),
      );
    },

    addCartItem(request: MarketplaceAddCartItemRequest) {
      return requestEnvelope<MarketplaceCart>(() =>
        httpClient.post(`${MARKETPLACE_API_PREFIX}/cart/items`, request),
      );
    },

    updateCartItem(productId: number, request: MarketplaceUpdateCartItemRequest) {
      return requestEnvelope<MarketplaceCart>(() =>
        httpClient.put(`${MARKETPLACE_API_PREFIX}/cart/items/${productId}`, request),
      );
    },

    removeCartItem(productId: number) {
      return requestEnvelope<MarketplaceCart>(() =>
        httpClient.delete(`${MARKETPLACE_API_PREFIX}/cart/items/${productId}`),
      );
    },

    mergeCart(request: MarketplaceMergeCartRequest) {
      return requestEnvelope<MarketplaceCart>(() =>
        httpClient.post(`${MARKETPLACE_API_PREFIX}/cart/merge`, request),
      );
    },

    createOrder(request: MarketplaceCreateOrderRequest) {
      return requestEnvelope<MarketplaceCreateOrderResult>(() =>
        httpClient.post(`${MARKETPLACE_API_PREFIX}/orders`, request, {
          headers: {
            'X-Idempotency-Key': request.idempotencyKey,
          },
        }),
      );
    },

    createShippingQuotes(request: {
      addressId?: number;
      recipientProvince: string;
      items?: Array<{ productId: number; quantity: number }>;
    }) {
      return requestEnvelope<MarketplaceShippingQuoteGroup[]>(() =>
        httpClient.post(`${MARKETPLACE_API_PREFIX}/shipping-quotes`, request),
      );
    },

    listOrders(query?: MarketplaceOrderQuery) {
      return requestEnvelope<MarketplaceOrderPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/orders`, {
          params: { ...query, status: normalizeOrderStatus(query?.status) },
        }),
      );
    },

    getOrderDetail(orderId: number) {
      return requestEnvelope<MarketplaceOrder>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/orders/${orderId}`),
      );
    },

    cancelOrder(orderId: number) {
      return requestEnvelope<MarketplaceOrder>(() =>
        httpClient.put(`${MARKETPLACE_API_PREFIX}/orders/${orderId}/cancel`),
      );
    },

    uploadOrderPaymentProof(orderId: number, file: File) {
      const formData = new FormData();
      formData.append("file", file);
      return requestEnvelope<MarketplaceOrder>(() =>
        httpClient.post(`${MARKETPLACE_API_PREFIX}/orders/${orderId}/payment-proof`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }),
      );
    },

    listAddresses() {
      return requestEnvelope<MarketplaceAddress[]>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/addresses`),
      );
    },

    createAddress(request: MarketplaceAddressUpsertRequest) {
      return requestEnvelope<MarketplaceAddress>(() =>
        httpClient.post(`${MARKETPLACE_API_PREFIX}/addresses`, request),
      );
    },

    updateAddress(addressId: number, request: MarketplaceAddressUpsertRequest) {
      return requestEnvelope<MarketplaceAddress>(() =>
        httpClient.patch(`${MARKETPLACE_API_PREFIX}/addresses/${addressId}`, request),
      );
    },

    deleteAddress(addressId: number) {
      return requestEnvelope<null>(() =>
        httpClient.delete(`${MARKETPLACE_API_PREFIX}/addresses/${addressId}`),
      );
    },

    createReview(request: MarketplaceCreateReviewRequest) {
      return requestEnvelope<MarketplaceReview>(() =>
        httpClient.post(`/api/v1/buyer/orders/${request.orderId}/reviews`, {
          orderItemId: request.orderItemId,
          rating: request.rating,
          comment: request.comment,
        }),
      );
    },

    getFarmerDashboard() {
      return requestEnvelope<MarketplaceFarmerDashboard>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farmer/dashboard`),
      ).then((response) => ({
        ...response,
        result: assertMarketplaceDashboardContract(
          response.result,
          [
            "totalProducts",
            "pendingReviewProducts",
            "publishedProducts",
            "lowStockProducts",
            "pendingOrders",
            "totalRevenue",
            "hasProducts",
            "hasOrders",
            "hasRevenueData",
            "lastOrderAt",
            "unavailableReasons",
            "recentOrders",
          ] as const,
          "Marketplace farmer dashboard payload",
        ),
      }));
    },

    listFarmerProducts(query?: MarketplaceFarmerProductQuery) {
      return requestEnvelope<MarketplaceProductPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farmer/products`, {
          params: { ...query, status: normalizeProductStatus(query?.status) },
        }),
      );
    },

    getFarmerProductFormOptions() {
      return requestEnvelope<MarketplaceFarmerProductFormOptions>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farmer/product-form-options`),
      );
    },

    getFarmerProductDetail(productId: number) {
      return requestEnvelope<MarketplaceProductDetail>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farmer/products/${productId}`),
      );
    },

    createFarmerProduct(request: MarketplaceFarmerProductUpsertRequest) {
      return requestEnvelope<MarketplaceProductDetail>(() =>
        httpClient.post(`${MARKETPLACE_API_PREFIX}/farmer/products`, request),
      );
    },

    uploadFarmerProductImage(file: File) {
      const formData = new FormData();
      formData.append("file", file);
      return requestEnvelope<MarketplaceProductImageUploadResponse>(() =>
        httpClient.post(`${MARKETPLACE_API_PREFIX}/farmer/product-images`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }),
      );
    },

    updateFarmerProduct(productId: number, request: MarketplaceFarmerProductUpsertRequest) {
      return requestEnvelope<MarketplaceProductDetail>(() =>
        httpClient.put(`${MARKETPLACE_API_PREFIX}/farmer/products/${productId}`, request),
      );
    },

    updateFarmerProductStatus(productId: number, request: MarketplaceUpdateProductStatusRequest) {
      return requestEnvelope<MarketplaceProductDetail>(() =>
        httpClient.patch(`${MARKETPLACE_API_PREFIX}/farmer/products/${productId}/status`, {
          ...request,
          status: normalizeProductStatus(request.status),
        }),
      );
    },

    listFarmerOrders(query?: MarketplaceFarmerOrderQuery) {
      return requestEnvelope<MarketplaceOrderPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farmer/orders`, {
          params: { ...query, status: normalizeOrderStatus(query?.status) },
        }),
      );
    },

    getFarmerOrderDetail(orderId: number) {
      return requestEnvelope<MarketplaceOrder>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/farmer/orders/${orderId}`),
      );
    },

    updateFarmerOrderStatus(orderId: number, request: MarketplaceUpdateOrderStatusRequest) {
      return requestEnvelope<MarketplaceOrder>(() =>
        httpClient.patch(`${MARKETPLACE_API_PREFIX}/farmer/orders/${orderId}/status`, {
          ...request,
          status: normalizeOrderStatus(request.status),
        }),
      );
    },

    listAdminProducts(query?: MarketplaceAdminProductQuery) {
      return requestEnvelope<MarketplaceProductPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/admin/products`, {
          params: { ...query, status: normalizeProductStatus(query?.status) },
        }),
      );
    },

    getAdminProductDetail(productId: number) {
      return requestEnvelope<MarketplaceProductDetail>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/admin/products/${productId}`),
      );
    },

    updateAdminProductStatus(productId: number, request: MarketplaceUpdateProductStatusRequest) {
      return requestEnvelope<MarketplaceProductDetail>(() =>
        httpClient.patch(`${MARKETPLACE_API_PREFIX}/admin/products/${productId}/status`, {
          ...request,
          status: normalizeProductStatus(request.status),
        }),
      );
    },

    listAdminOrders(query?: MarketplaceAdminOrderQuery) {
      return requestEnvelope<MarketplaceOrderPage>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/admin/orders`, {
          params: { ...query, status: normalizeOrderStatus(query?.status) },
        }),
      );
    },

    getAdminOrderDetail(orderId: number) {
      return requestEnvelope<MarketplaceOrder>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/admin/orders/${orderId}`),
      );
    },

    updateAdminOrderPaymentVerification(orderId: number, request: MarketplaceUpdatePaymentVerificationRequest) {
      return requestEnvelope<MarketplaceOrder>(() =>
        httpClient.patch(`${MARKETPLACE_API_PREFIX}/admin/orders/${orderId}/payment-verification`, request),
      );
    },

    updateAdminOrderStatus(orderId: number, request: MarketplaceUpdateOrderStatusRequest) {
      return requestEnvelope<MarketplaceOrder>(() =>
        httpClient.patch(`${MARKETPLACE_API_PREFIX}/admin/orders/${orderId}/status`, {
          ...request,
          status: normalizeOrderStatus(request.status),
        }),
      );
    },

    listAdminOrderAuditLogs(orderId: number) {
      return requestEnvelope<MarketplaceOrderAuditLog[]>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/admin/orders/${orderId}/audit-logs`),
      );
    },

    getAdminStats() {
      return requestEnvelope<MarketplaceAdminStats>(() =>
        httpClient.get(`${MARKETPLACE_API_PREFIX}/admin/stats`),
      ).then((response) => ({
        ...response,
        result: assertMarketplaceDashboardContract(
          response.result,
          [
            "totalProducts",
            "pendingReviewProducts",
            "publishedProducts",
            "hiddenProducts",
            "totalOrders",
            "activeOrders",
            "completedOrders",
            "cancelledOrders",
            "pendingPaymentVerificationOrders",
            "totalRevenue",
            "hasProducts",
            "hasOrders",
            "hasRevenueData",
            "lastOrderAt",
            "unavailableReasons",
          ] as const,
          "Marketplace admin stats payload",
        ),
      }));
    },
  };
}
