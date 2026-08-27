package org.example.marketplace.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Full buyer-facing traceability response for a marketplace product or purchased order item.
 * Each section is nullable — partial data is returned gracefully when upstream data is missing.
 */
public record MarketplaceTraceabilityResponse(
        Long productId,
        Boolean traceable,
        FarmTraceability farm,
        PlotTraceability plot,
        SeasonTraceability season,
        HarvestTraceability harvest,
        ProductLotTraceability productLot,
        List<TimelineMilestone> timeline,
        LocalDateTime validatedAt,
        CertificationInfo certification,
        PHISafetyInfo phiSafety,
        NutritionClaim nutritionClaim) {

    public record FarmTraceability(
            Integer id,
            String name,
            String region,
            String address,
            String certificationInfo) {
    }

    public record PlotTraceability(
            Integer id,
            String name,
            BigDecimal area) {
    }

    public record SeasonTraceability(
            Integer id,
            String name,
            String cropName,
            String varietyName,
            LocalDate plantingDate,
            LocalDate harvestDate) {
    }

    public record HarvestTraceability(
            Integer id,
            LocalDate harvestDate,
            BigDecimal quantity,
            String qualityNotes) {
    }

    public record ProductLotTraceability(
            Integer id,
            String lotCode,
            LocalDate harvestedAt,
            LocalDateTime receivedAt,
            String unit,
            BigDecimal initialQuantity,
            String grade,
            String warehouseName,
            String storageLocation) {
    }

    public record TimelineMilestone(
            String milestone,
            LocalDateTime date,
            String description) {
    }

    public record CertificationInfo(
            String certificationName,
            String certificationType,   // "VIETGAP_PLANTING"
            String status,
            LocalDate issuedDate,
            LocalDate expiryDate,
            BigDecimal complianceScore,
            String certificateNumber,
            Boolean scopeMatched,
            List<CertificationScopeInfo> scopes,
            Integer missingMandatoryEvidenceCount,
            List<MissingEvidenceInfo> missingEvidenceItems
    ) {}

    public record CertificationScopeInfo(
            Integer seasonId,
            Integer plotId,
            String plotName,
            Integer cropId,
            String cropName,
            Integer varietyId,
            String varietyName,
            BigDecimal registeredAreaHa,
            BigDecimal expectedYieldKg
    ) {}

    public record MissingEvidenceInfo(
            String itemCode,
            String category,
            String description
    ) {}

    public record PHISafetyInfo(
            boolean isSafe,             // true nếu không có vi phạm PHI
            int totalPesticidesUsed,
            int safePesticides,         // đã hết cách ly
            int cautionPesticides,      // sắp hết cách ly (≤3 ngày)
            List<PesticideUsageItem> usage
    ) {
        public record PesticideUsageItem(
                String pesticideName,
                LocalDate applicationDate,
                LocalDate harvestAllowedDate,
                String status  // SAFE, CAUTION, BLOCKED
        ) {}
    }

    public record NutritionClaim(
            String soilOrganicMatter,
            String soilPH,
            String nitrogenLevel
    ) {}
}
