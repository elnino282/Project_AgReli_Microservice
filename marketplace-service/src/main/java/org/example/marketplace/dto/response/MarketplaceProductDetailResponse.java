package org.example.marketplace.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.example.marketplace.model.MarketplaceProductStatus;

public record MarketplaceProductDetailResponse(
        Long id,
        String slug,
        String name,
        String category,
        String shortDescription,
        String description,
        BigDecimal price,
        String unit,
        BigDecimal stockQuantity,
        BigDecimal availableQuantity,
        BigDecimal shippingWeightKgPerUnit,
        Boolean perishable,
        Boolean requiresColdChain,
        String imageUrl,
        List<String> imageUrls,
        Long farmerUserId,
        String farmerDisplayName,
        Integer farmId,
        String farmName,
        Integer seasonId,
        String seasonName,
        Integer lotId,
        String region,
        Boolean traceable,
        String traceabilityCode,
        Double ratingAverage,
        Long ratingCount,
        MarketplaceProductStatus status,
        String statusReason,
        LocalDateTime publishedAt,
        LocalDateTime statusChangedAt,
        Boolean allowsPreOrder,
        java.time.LocalDate earliestFulfillmentDate,
        Boolean approvalEligible,
        List<String> approvalBlockers,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
