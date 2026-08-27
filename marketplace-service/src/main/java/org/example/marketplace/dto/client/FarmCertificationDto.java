package org.example.marketplace.dto.client;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FarmCertificationDto(
        String certificationName,
        String certificationType,
        String status,
        LocalDate issuedDate,
        LocalDate expiryDate,
        BigDecimal complianceScore,
        String certificateNumber,
        Boolean scopeMatched,
        java.util.List<ScopeDto> scopes,
        Integer missingMandatoryEvidenceCount,
        java.util.List<MissingEvidenceItemDto> missingEvidenceItems
) {
    public record ScopeDto(
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

    public record MissingEvidenceItemDto(
            String itemCode,
            String category,
            String description
    ) {}
}
