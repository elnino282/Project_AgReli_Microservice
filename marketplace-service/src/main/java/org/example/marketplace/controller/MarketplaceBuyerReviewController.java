package org.example.marketplace.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.DTO.Common.ApiResponse;
import org.example.marketplace.dto.request.MarketplaceCreateReviewRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateReviewRequest;
import org.example.marketplace.dto.response.MarketplaceReviewResponse;
import org.example.marketplace.service.MarketplaceService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Buyer review endpoints.
 * <ul>
 *   <li>POST   /api/v1/buyer/orders/{orderId}/reviews — submit review for an order item</li>
 *   <li>PATCH  /api/v1/buyer/reviews/{id}             — edit own review</li>
 *   <li>DELETE /api/v1/buyer/reviews/{id}              — delete own review</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/buyer")
@PreAuthorize("hasRole('BUYER')")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceBuyerReviewController {

    MarketplaceService marketplaceService;

    @PostMapping("/orders/{orderId}/reviews")
    public ApiResponse<MarketplaceReviewResponse> createReview(
            @PathVariable Long orderId,
            @Valid @RequestBody MarketplaceCreateReviewRequest request) {
        return ApiResponse.success(marketplaceService.createReview(orderId, request));
    }

    @PatchMapping("/reviews/{reviewId}")
    public ApiResponse<MarketplaceReviewResponse> editReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody MarketplaceUpdateReviewRequest request) {
        return ApiResponse.success(marketplaceService.editReview(reviewId, request));
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ApiResponse<Void> deleteReview(@PathVariable Long reviewId) {
        marketplaceService.deleteReview(reviewId);
        return ApiResponse.success(null);
    }
}
