package org.example.marketplace.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.DTO.Common.ApiResponse;
import org.example.DTO.Common.PageResponse;
import org.example.marketplace.dto.request.MarketplaceUpdateOrderStatusRequest;
import org.example.marketplace.dto.response.MarketplaceOrderResponse;
import org.example.marketplace.model.MarketplaceOrderStatus;
import org.example.marketplace.service.MarketplaceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * URL alias controller for farmer order endpoints.
 * Maps {@code /api/v1/farmer/orders} to the same service methods as
 * {@code /api/v1/marketplace/farmer/orders} for API convention compatibility.
 */
@RestController
@RequestMapping("/api/v1/farmer/orders")
@PreAuthorize("hasRole('FARMER')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceFarmerOrderAliasController {

    MarketplaceService marketplaceService;

    @GetMapping
    public ApiResponse<PageResponse<MarketplaceOrderResponse>> listOrders(
            @RequestParam(value = "status", required = false) MarketplaceOrderStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(marketplaceService.listFarmerOrders(status, page, size));
    }

    @GetMapping("/{orderId}")
    public ApiResponse<MarketplaceOrderResponse> getOrderDetail(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.getFarmerOrderDetail(orderId));
    }

    @PatchMapping("/{orderId}/status")
    public ApiResponse<MarketplaceOrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody MarketplaceUpdateOrderStatusRequest request) {
        return ApiResponse.success(marketplaceService.updateFarmerOrderStatus(orderId, request));
    }
}
