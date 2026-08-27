package org.example.sustainability.dto.request;

import jakarta.validation.constraints.DecimalMax;
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
import org.example.sustainability.enums.NutrientInputSourceType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateSoilTestRequest {

    @NotNull(message = "KEY_INVALID")
    Integer plotId;

    @NotNull(message = "KEY_INVALID")
    LocalDate sampleDate;

    @DecimalMin(value = "0.0", inclusive = true, message = "KEY_INVALID")
    @DecimalMax(value = "14.0", inclusive = true, message = "KEY_INVALID")
    BigDecimal soilPh;

    @DecimalMin(value = "0.0", inclusive = true, message = "KEY_INVALID")
    BigDecimal electricalConductivityDsM;

    @DecimalMin(value = "0.0", inclusive = true, message = "KEY_INVALID")
    @DecimalMax(value = "100.0", inclusive = true, message = "KEY_INVALID")
    BigDecimal soilOrganicMatterPct;

    @NotNull(message = "KEY_INVALID")
    @DecimalMin(value = "0.0", inclusive = true, message = "KEY_INVALID")
    BigDecimal mineralNKgPerHa;

    @DecimalMin(value = "0.0", inclusive = true, message = "KEY_INVALID")
    BigDecimal nitrateMgPerKg;

    @DecimalMin(value = "0.0", inclusive = true, message = "KEY_INVALID")
    BigDecimal ammoniumMgPerKg;

    @NotNull(message = "KEY_INVALID")
    NutrientInputSourceType sourceType;

    String sourceDocument;

    String labReference;

    String note;
}
