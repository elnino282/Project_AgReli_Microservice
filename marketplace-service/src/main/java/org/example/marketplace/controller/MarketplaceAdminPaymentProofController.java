package org.example.marketplace.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.DTO.Common.ApiResponse;
import org.example.DTO.Common.PageResponse;
import org.example.marketplace.dto.request.MarketplaceRejectPaymentProofRequest;
import org.example.marketplace.dto.response.MarketplacePaymentProofResponse;
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
 * Admin controller for payment proof verification.
 * <p>
 * Base path: {@code /api/v1/admin/marketplace/payment-proofs}
 * <p>
 * Security: Enforced by {@code @PreAuthorize} at the controller level.
 */
@RestController
@RequestMapping("/api/v1/admin/marketplace/payment-proofs")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceAdminPaymentProofController {

    MarketplaceService marketplaceService;

    @GetMapping
    public ApiResponse<PageResponse<MarketplacePaymentProofResponse>> listPaymentProofs(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(marketplaceService.listAdminPaymentProofs(page, size));
    }

    @PatchMapping("/{orderId}/verify")
    public ApiResponse<MarketplacePaymentProofResponse> verifyPaymentProof(@PathVariable Long orderId) {
        return ApiResponse.success(marketplaceService.verifyAdminPaymentProof(orderId));
    }

    @PatchMapping("/{orderId}/reject")
    public ApiResponse<MarketplacePaymentProofResponse> rejectPaymentProof(
            @PathVariable Long orderId,
            @Valid @RequestBody MarketplaceRejectPaymentProofRequest request) {
        return ApiResponse.success(marketplaceService.rejectAdminPaymentProof(orderId, request));
    }
}
