package org.example.season.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateHarvestDetailRequest {

    @NotNull(message = "KEY_INVALID")
    LocalDate harvestDate;

    @NotNull(message = "INVALID_HARVEST_QUANTITY")
    @DecimalMin(value = "0.0", inclusive = false, message = "INVALID_HARVEST_QUANTITY")
    BigDecimal quantity;

    @NotNull(message = "KEY_INVALID")
    @DecimalMin(value = "0.0", inclusive = false, message = "KEY_INVALID")
    BigDecimal unit;

    String grade;

    String note;

    // === Quality Grading ===
    String qualityGrade;
    String qualityNotes;
    BigDecimal subStandardQuantity;
    String subStandardDisposition;

    // === Packaging & Processing ===
    String packagingType;
    Integer packagingCount;
    String processingType;

    BigDecimal grossWetWeight;
}
