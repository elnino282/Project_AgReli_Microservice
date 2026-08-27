package org.example.farm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificationApplicationResponse {
    private Integer recordId;
    private Integer farmId;
    private String farmName;
    private String standardCode;
    private String standardName;
    private List<CertificationScopeResponse> scopes;
    private BigDecimal complianceScore;
    private String status;
    private LocalDateTime appliedAt;
    private LocalDate nextPeriodicReviewDate;
    private LocalDate expiryDate;
}
