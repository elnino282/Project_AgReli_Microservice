package org.example.marketplace.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.DTO.Common.ApiResponse;
import org.example.DTO.Common.PageResponse;
import java.util.List;
import org.example.marketplace.dto.request.MarketplaceUpdateOrderStatusRequest;
import org.example.marketplace.dto.request.MarketplaceUpdatePaymentVerificationRequest;
import org.example.marketplace.dto.response.MarketplaceOrderAuditLogResponse;
import org.example.marketplace.dto.request.MarketplaceUpdateProductStatusRequest;
import org.example.marketplace.dto.response.MarketplaceAdminStatsResponse;
import org.example.marketplace.dto.response.MarketplaceOrderResponse;
import org.example.marketplace.dto.response.MarketplaceProductDetailResponse;
import org.example.marketplace.dto.response.MarketplaceProductSummaryResponse;
import org.example.marketplace.dto.response.MarketplaceReviewResponse;
import org.example.marketplace.model.MarketplaceOrderStatus;
import org.example.marketplace.model.MarketplaceProductStatus;
import org.example.marketplace.service.MarketplaceService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/v1/marketplace/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceAdminController {

    MarketplaceService marketplaceService;

    @GetMapping("/products")
    public ApiResponse<PageResponse<MarketplaceProductSummaryResponse>> listProducts(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "status", required = false) MarketplaceProductStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(marketplaceService.listAdminProducts(q, status, page, size));
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<MarketplaceProductDetailResponse> getProductDetail(@PathVariable Long productId) {
        return ApiResponse.success(marketplaceService.getAdminProductDetail(productId));
    }

    @PatchMapping("/products/{productId}/status")
    public ApiResponse<MarketplaceProductDetailResponse> updateProductStatus(
            @PathVariable Long productId,
            @Valid @RequestBody MarketplaceUpdateProductStatusRequest request) {
        return ApiResponse.success(marketplaceService.updateAdminProductStatus(productId, request));
    }

    @GetMapping("/products/{productId}/compliance-check")
    public ApiResponse<org.example.marketplace.dto.response.ComplianceCheckResponse> checkProductCompliance(@PathVariable Long productId) {
        return ApiResponse.success(marketplaceService.checkProductCompliance(productId));
    }

    @GetMapping("/orders")
    public ApiResponse<PageResponse<MarketplaceOrderResponse>> listOrders(
            @RequestParam(value = "status", required = false) MarketplaceOrderStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(marketplaceService.listAdminOrders(status, page, size));
    }

    @GetMapping("/orders/{orderId}")
    public ApiResponse<MarketplaceOrderResponse> getOrderDetail(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.getAdminOrderDetail(orderId));
    }

    @PatchMapping("/orders/{orderId}/payment-verification")
    public ApiResponse<MarketplaceOrderResponse> updatePaymentVerification(
            @PathVariable Long orderId,
            @Valid @RequestBody MarketplaceUpdatePaymentVerificationRequest request) {
        return ApiResponse.success(marketplaceService.updateAdminPaymentVerification(orderId, request));
    }

    @PatchMapping("/orders/{orderId}/status")
    public ApiResponse<MarketplaceOrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody MarketplaceUpdateOrderStatusRequest request) {
        return ApiResponse.success(marketplaceService.updateAdminOrderStatus(orderId, request));
    }

    @GetMapping("/orders/{orderId}/audit-logs")
    public ApiResponse<List<MarketplaceOrderAuditLogResponse>> getOrderAuditLogs(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.listOrderAuditLogs(orderId));
    }

    @GetMapping("/stats")
    public ApiResponse<MarketplaceAdminStatsResponse> getStats() {
        return ApiResponse.success(marketplaceService.getAdminStats());
    }

    @PatchMapping("/reviews/{reviewId}/hide")
    public ApiResponse<MarketplaceReviewResponse> hideReview(@PathVariable Long reviewId) {
        return ApiResponse.success(marketplaceService.adminHideReview(reviewId));
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ApiResponse<Void> deleteReview(@PathVariable Long reviewId) {
        marketplaceService.adminDeleteReview(reviewId);
        return ApiResponse.success(null);
    }
}
