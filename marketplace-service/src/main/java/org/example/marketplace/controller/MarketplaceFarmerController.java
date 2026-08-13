package org.example.marketplace.controller;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.DTO.Common.ApiResponse;
import org.example.DTO.Common.PageResponse;
import org.example.marketplace.dto.request.MarketplaceFarmerProductUpsertRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateOrderStatusRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateProductStatusRequest;
import org.example.marketplace.dto.response.MarketplaceFarmerDashboardResponse;
import org.example.marketplace.dto.response.MarketplaceFarmerProductFormOptionsResponse;
import org.example.marketplace.dto.response.MarketplaceOrderResponse;
import org.example.marketplace.dto.response.MarketplaceProductDetailResponse;
import org.example.marketplace.dto.response.MarketplaceProductImageUploadResponse;
import org.example.marketplace.dto.response.MarketplaceProductSummaryResponse;
import org.example.marketplace.model.MarketplaceOrderStatus;
import org.example.marketplace.model.MarketplaceProductStatus;
import org.example.marketplace.service.MarketplaceService;
import org.example.marketplace.service.MarketplaceStorageService;
import org.example.marketplace.shared.security.CurrentUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/marketplace/farmer")
@PreAuthorize("hasRole('FARMER')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceFarmerController {

    MarketplaceService marketplaceService;
    MarketplaceStorageService storageService;
    CurrentUserService currentUserService;

    @GetMapping("/dashboard")
    public ApiResponse<MarketplaceFarmerDashboardResponse> getDashboard() {
        return ApiResponse.success(marketplaceService.getFarmerDashboard());
    }

    @GetMapping("/products")
    public ApiResponse<PageResponse<MarketplaceProductSummaryResponse>> listProducts(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "status", required = false) MarketplaceProductStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(marketplaceService.listFarmerProducts(q, status, page, size));
    }

    @GetMapping("/product-form-options")
    public ApiResponse<MarketplaceFarmerProductFormOptionsResponse> getProductFormOptions() {
        return ApiResponse.success(marketplaceService.getFarmerProductFormOptions());
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<MarketplaceProductDetailResponse> getProductDetail(@PathVariable Long productId) {
        return ApiResponse.success(marketplaceService.getFarmerProductDetail(productId));
    }

    @PostMapping("/products")
    public ApiResponse<MarketplaceProductDetailResponse> createProduct(
            @Valid @RequestBody MarketplaceFarmerProductUpsertRequest request) {
        return ApiResponse.success(marketplaceService.createFarmerProduct(request));
    }

    @PostMapping("/product-images")
    public ApiResponse<MarketplaceProductImageUploadResponse> uploadProductImage(
            @RequestParam("file") MultipartFile file) {
        Long userId = currentUserService.getCurrentUserId();
        return ApiResponse.success(storageService.storeProductImage(file, userId));
    }

    @PutMapping("/products/{productId}")
    public ApiResponse<MarketplaceProductDetailResponse> updateProduct(
            @PathVariable Long productId,
            @Valid @RequestBody MarketplaceFarmerProductUpsertRequest request) {
        return ApiResponse.success(marketplaceService.updateFarmerProduct(productId, request));
    }

    @PatchMapping("/products/{productId}/status")
    public ApiResponse<MarketplaceProductDetailResponse> updateProductStatus(
            @PathVariable Long productId,
            @Valid @RequestBody MarketplaceUpdateProductStatusRequest request) {
        return ApiResponse.success(marketplaceService.updateFarmerProductStatus(productId, request));
    }

    @GetMapping("/orders")
    public ApiResponse<PageResponse<MarketplaceOrderResponse>> listOrders(
            @RequestParam(value = "status", required = false) MarketplaceOrderStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(marketplaceService.listFarmerOrders(status, page, size));
    }

    @GetMapping("/orders/{orderId}")
    public ApiResponse<MarketplaceOrderResponse> getOrderDetail(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.getFarmerOrderDetail(orderId));
    }

    @PatchMapping("/orders/{orderId}/status")
    public ApiResponse<MarketplaceOrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody MarketplaceUpdateOrderStatusRequest request) {
        return ApiResponse.success(marketplaceService.updateFarmerOrderStatus(orderId, request));
    }
}
