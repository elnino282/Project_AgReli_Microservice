package org.example.farm.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificationScopeResponse {
    private Integer id;
    private Integer seasonId;
    private Integer plotId;
    private String plotName;
    private Integer cropId;
    private String cropName;
    private Integer varietyId;
    private String varietyName;
    private BigDecimal registeredAreaHa;
    private BigDecimal expectedYieldKg;
}
