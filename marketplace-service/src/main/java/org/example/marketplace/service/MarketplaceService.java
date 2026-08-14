package org.example.marketplace.service;

import org.example.marketplace.dto.request.MarketplaceAddCartItemRequest;
import org.example.marketplace.dto.request.MarketplaceAddressUpsertRequest;
import org.example.marketplace.dto.request.MarketplaceCreateOrderRequest;
import org.example.marketplace.dto.request.MarketplaceCreateReviewRequest;
import org.example.marketplace.dto.request.MarketplaceFarmerProductUpsertRequest;
import org.example.marketplace.dto.request.MarketplaceMergeCartRequest;
import org.example.marketplace.dto.request.MarketplaceRejectPaymentProofRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateCartItemRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateOrderStatusRequest;
import org.example.marketplace.dto.request.MarketplaceUpdatePaymentVerificationRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateProductStatusRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateReviewRequest;
import org.example.marketplace.dto.response.MarketplaceAdminStatsResponse;
import org.example.marketplace.dto.response.MarketplaceAddressResponse;
import org.example.marketplace.dto.response.MarketplaceCartResponse;
import org.example.marketplace.dto.response.MarketplaceCreateOrderResultResponse;
import org.example.marketplace.dto.response.MarketplaceFarmerDashboardResponse;
import org.example.marketplace.dto.response.MarketplaceFarmerProductFormOptionsResponse;
import org.example.marketplace.dto.response.MarketplaceFarmDetailResponse;
import org.example.marketplace.dto.response.MarketplaceFarmSummaryResponse;
import org.example.marketplace.dto.response.MarketplaceOrderAuditLogResponse;
import org.example.marketplace.dto.response.MarketplaceOrderPreviewResponse;
import org.example.marketplace.dto.response.MarketplaceOrderResponse;
import org.example.marketplace.dto.response.MarketplacePaymentProofResponse;
import org.example.marketplace.dto.response.MarketplaceProductDetailResponse;
import org.example.marketplace.dto.response.MarketplaceProductSummaryResponse;
import org.example.marketplace.dto.response.MarketplaceReviewResponse;
import org.example.marketplace.dto.response.MarketplaceTraceabilityResponse;
import org.example.marketplace.dto.request.MarketplaceShippingQuoteRequest;
import org.example.marketplace.dto.response.MarketplaceShippingQuoteGroupResponse;
import org.example.DTO.Common.PageResponse;
import org.example.marketplace.model.MarketplaceOrderStatus;
import org.example.marketplace.model.MarketplaceProductStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

public interface MarketplaceService {

    // Product listing
    PageResponse<MarketplaceProductSummaryResponse> listProducts(
            String category, String q, String region, Boolean traceable,
            BigDecimal minPrice, BigDecimal maxPrice, String sort,
            Integer farmId, int page, int size);

    MarketplaceProductDetailResponse getProductBySlug(String slug);

    PageResponse<MarketplaceReviewResponse> listProductReviews(Long productId, int page, int size);

    // Farm listing
    PageResponse<MarketplaceFarmSummaryResponse> listFarms(String q, String region, int page, int size);

    MarketplaceFarmDetailResponse getFarmDetail(Integer farmId);

    PageResponse<MarketplaceReviewResponse> listFarmReviews(Integer farmId, int page, int size);

    // Traceability
    MarketplaceTraceabilityResponse getTraceability(Long productId);

    MarketplaceTraceabilityResponse getPublicTraceability(String productIdOrSlug);

    byte[] getProductQRCode(Long productId, int width);

    MarketplaceTraceabilityResponse getOrderItemTraceability(Long orderId, Long itemId);

    // Reviews (Buyer)
    MarketplaceReviewResponse createReview(Long orderId, MarketplaceCreateReviewRequest request);

    MarketplaceReviewResponse createReviewLegacy(MarketplaceCreateReviewRequest request);

    MarketplaceReviewResponse editReview(Long reviewId, MarketplaceUpdateReviewRequest request);

    void deleteReview(Long reviewId);

    // Reviews (Admin)
    MarketplaceReviewResponse adminHideReview(Long reviewId);

    void adminDeleteReview(Long reviewId);

    // Cart
    MarketplaceCartResponse getCart();

    MarketplaceCartResponse addCartItem(MarketplaceAddCartItemRequest request);

    MarketplaceCartResponse updateCartItem(Long productId, MarketplaceUpdateCartItemRequest request);

    MarketplaceCartResponse removeCartItem(Long productId);

    MarketplaceCartResponse mergeCart(MarketplaceMergeCartRequest request);

    MarketplaceCartResponse clearCart();

    // Orders (Buyer)
    MarketplaceOrderPreviewResponse previewOrder(MarketplaceCreateOrderRequest request);

    List<MarketplaceShippingQuoteGroupResponse> createShippingQuotes(MarketplaceShippingQuoteRequest request);

    MarketplaceCreateOrderResultResponse createOrder(MarketplaceCreateOrderRequest request, String idempotencyKey);

    MarketplaceOrderResponse uploadPaymentProof(Long orderId, MultipartFile file);

    PageResponse<MarketplaceOrderResponse> listOrders(String status, int page, int size);

    MarketplaceOrderResponse getOrderDetail(Long orderId);

    MarketplaceOrderResponse cancelOrder(Long orderId);

    // Orders (Farmer)
    PageResponse<MarketplaceOrderResponse> listFarmerOrders(MarketplaceOrderStatus status, int page, int size);

    MarketplaceOrderResponse getFarmerOrderDetail(Long orderId);

    MarketplaceOrderResponse updateFarmerOrderStatus(Long orderId, MarketplaceUpdateOrderStatusRequest request);

    // Orders (Admin)
    PageResponse<MarketplaceOrderResponse> listAdminOrders(MarketplaceOrderStatus status, int page, int size);

    MarketplaceOrderResponse getAdminOrderDetail(Long orderId);

    MarketplaceOrderResponse updateAdminOrderStatus(Long orderId, MarketplaceUpdateOrderStatusRequest request);

    MarketplaceOrderResponse updateAdminPaymentVerification(Long orderId, MarketplaceUpdatePaymentVerificationRequest request);

    List<MarketplaceOrderAuditLogResponse> listOrderAuditLogs(Long orderId);

    MarketplaceAdminStatsResponse getAdminStats();

    // Payment Proofs
    PageResponse<MarketplacePaymentProofResponse> listAdminPaymentProofs(int page, int size);

    MarketplacePaymentProofResponse getPaymentProof(Long orderId);

    MarketplacePaymentProofResponse verifyAdminPaymentProof(Long orderId);

    MarketplacePaymentProofResponse rejectAdminPaymentProof(Long orderId, MarketplaceRejectPaymentProofRequest request);

    // Addresses (Buyer)
    List<MarketplaceAddressResponse> listAddresses();

    MarketplaceAddressResponse createAddress(MarketplaceAddressUpsertRequest request);

    MarketplaceAddressResponse updateAddress(Long addressId, MarketplaceAddressUpsertRequest request);

    MarketplaceAddressResponse setDefaultAddress(Long addressId);

    void deleteAddress(Long addressId);

    // Farmer Products
    MarketplaceFarmerDashboardResponse getFarmerDashboard();

    PageResponse<MarketplaceProductSummaryResponse> listFarmerProducts(
            String q, MarketplaceProductStatus status, int page, int size);

    MarketplaceFarmerProductFormOptionsResponse getFarmerProductFormOptions();

    MarketplaceProductDetailResponse getFarmerProductDetail(Long productId);

    MarketplaceProductDetailResponse createFarmerProduct(MarketplaceFarmerProductUpsertRequest request);

    MarketplaceProductDetailResponse updateFarmerProduct(Long productId, MarketplaceFarmerProductUpsertRequest request);

    MarketplaceProductDetailResponse updateFarmerProductStatus(Long productId, MarketplaceUpdateProductStatusRequest request);

    // Admin Products
    PageResponse<MarketplaceProductSummaryResponse> listAdminProducts(
            String q, MarketplaceProductStatus status, int page, int size);

    MarketplaceProductDetailResponse getAdminProductDetail(Long productId);

    MarketplaceProductDetailResponse updateAdminProductStatus(Long productId, MarketplaceUpdateProductStatusRequest request);

    org.example.marketplace.dto.response.ComplianceCheckResponse checkProductCompliance(Long productId);
}
