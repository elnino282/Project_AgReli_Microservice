package org.example.season.dto.response;

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
public class SeasonResponse {

    Integer id;
    String seasonName;
    Integer farmId;
    String farmName;
    Integer plotId;
    String plotName;
    Integer cropId;
    String cropName;
    Integer varietyId;
    String varietyName;
    LocalDate startDate;
    LocalDate plannedHarvestDate;
    LocalDate endDate;
    String status;
    BigDecimal expectedYieldKg;
    BigDecimal actualYieldKg;
}
