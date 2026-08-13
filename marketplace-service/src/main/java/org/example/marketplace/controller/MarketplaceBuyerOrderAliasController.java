package org.example.marketplace.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.DTO.Common.ApiResponse;
import org.example.DTO.Common.PageResponse;
import org.example.marketplace.dto.request.MarketplaceCreateOrderRequest;
import org.example.marketplace.dto.response.MarketplaceCreateOrderResultResponse;
import org.example.marketplace.dto.response.MarketplaceOrderPreviewResponse;
import org.example.marketplace.dto.response.MarketplaceOrderResponse;
import org.example.marketplace.dto.response.MarketplacePaymentProofResponse;
import org.example.marketplace.dto.response.MarketplaceTraceabilityResponse;
import org.example.marketplace.service.MarketplaceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * URL alias controller for buyer order endpoints.
 * Maps {@code /api/v1/buyer/orders} to the same service methods as
 * {@code /api/v1/marketplace/orders} for API convention compatibility.
 */
@RestController
@RequestMapping("/api/v1/buyer/orders")
@PreAuthorize("hasRole('BUYER')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceBuyerOrderAliasController {

    MarketplaceService marketplaceService;

    @PostMapping("/preview")
    public ApiResponse<MarketplaceOrderPreviewResponse> previewOrder(
            @Valid @RequestBody MarketplaceCreateOrderRequest request) {
        return ApiResponse.success(marketplaceService.previewOrder(request));
    }

    @PostMapping
    public ApiResponse<MarketplaceCreateOrderResultResponse> createOrder(
            @Valid @RequestBody MarketplaceCreateOrderRequest request,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKeyHeader) {
        return ApiResponse.success(marketplaceService.createOrder(request, idempotencyKeyHeader));
    }

    @GetMapping
    public ApiResponse<PageResponse<MarketplaceOrderResponse>> listOrders(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(marketplaceService.listOrders(status, page, size));
    }

    @GetMapping("/{orderId}")
    public ApiResponse<MarketplaceOrderResponse> getOrderDetail(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.getOrderDetail(orderId));
    }

    @PutMapping("/{orderId}/cancel")
    public ApiResponse<MarketplaceOrderResponse> cancelOrder(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.cancelOrder(orderId));
    }

    @PostMapping("/{orderId}/cancel")
    public ApiResponse<MarketplaceOrderResponse> cancelOrderPost(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.cancelOrder(orderId));
    }

    @PostMapping("/{orderId}/payment-proof")
    public ApiResponse<MarketplaceOrderResponse> uploadPaymentProof(
            @PathVariable Long orderId,
            @RequestParam("file") MultipartFile file) {
        return ApiResponse.success(marketplaceService.uploadPaymentProof(orderId, file));
    }

    @GetMapping("/{orderId}/payment-proof")
    public ApiResponse<MarketplacePaymentProofResponse> getPaymentProof(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.getPaymentProof(orderId));
    }

    @GetMapping("/{orderId}/items/{itemId}/traceability")
    public ApiResponse<MarketplaceTraceabilityResponse> getOrderItemTraceability(
            @PathVariable Long orderId,
            @PathVariable Long itemId) {
        return ApiResponse.success(marketplaceService.getOrderItemTraceability(orderId, itemId));
    }
}
