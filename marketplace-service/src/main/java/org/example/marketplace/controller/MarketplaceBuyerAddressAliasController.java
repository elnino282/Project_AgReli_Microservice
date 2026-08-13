package org.example.marketplace.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.DTO.Common.ApiResponse;
import org.example.marketplace.dto.request.MarketplaceAddressUpsertRequest;
import org.example.marketplace.dto.response.MarketplaceAddressResponse;
import org.example.marketplace.service.MarketplaceService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * URL alias controller for buyer address endpoints.
 * Maps {@code /api/v1/buyer/addresses} to the same service methods as
 * {@code /api/v1/marketplace/addresses} for API convention compatibility.
 */
@RestController
@RequestMapping("/api/v1/buyer/addresses")
@PreAuthorize("hasRole('BUYER')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceBuyerAddressAliasController {

    MarketplaceService marketplaceService;

    @GetMapping
    public ApiResponse<List<MarketplaceAddressResponse>> listAddresses() {
        return ApiResponse.success(marketplaceService.listAddresses());
    }

    @PostMapping
    public ApiResponse<MarketplaceAddressResponse> createAddress(
            @Valid @RequestBody MarketplaceAddressUpsertRequest request) {
        return ApiResponse.success(marketplaceService.createAddress(request));
    }

    @PatchMapping("/{addressId}")
    public ApiResponse<MarketplaceAddressResponse> updateAddress(
            @PathVariable Long addressId,
            @Valid @RequestBody MarketplaceAddressUpsertRequest request) {
        return ApiResponse.success(marketplaceService.updateAddress(addressId, request));
    }

    @DeleteMapping("/{addressId}")
    public ApiResponse<Void> deleteAddress(@PathVariable Long addressId) {
        marketplaceService.deleteAddress(addressId);
        return ApiResponse.success(null);
    }

    @PatchMapping("/{addressId}/default")
    public ApiResponse<MarketplaceAddressResponse> setDefaultAddress(@PathVariable Long addressId) {
        return ApiResponse.success(marketplaceService.setDefaultAddress(addressId));
    }
}
