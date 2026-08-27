package org.example.sustainability.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.sustainability.enums.NutrientInputSourceType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SoilTestResponse {

    Integer id;
    Integer seasonId;
    Integer plotId;
    String plotName;

    LocalDate sampleDate;
    BigDecimal soilPh;
    BigDecimal electricalConductivityDsM;
    BigDecimal soilOrganicMatterPct;
    BigDecimal mineralNKgPerHa;
    BigDecimal nitrateMgPerKg;
    BigDecimal ammoniumMgPerKg;

    String mineralNUnit;
    String concentrationUnit;

    BigDecimal estimatedNContributionKg;
    String contributionUnit;

    Boolean measured;
    String status;
    NutrientInputSourceType sourceType;
    String sourceDocument;
    String labReference;
    String note;
    Boolean legacyDerived;
    Integer migratedFromLegacyEventId;

    Long createdByUserId;
    LocalDateTime createdAt;
}
