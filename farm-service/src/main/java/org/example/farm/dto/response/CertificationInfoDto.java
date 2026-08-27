package org.example.farm.dto.response;

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
public class CertificationInfoDto {
    String certificationName;
    String certificationType;
    String status;
    LocalDate issuedDate;
    LocalDate expiryDate;
    BigDecimal complianceScore;
    String certificateNumber;
    Boolean scopeMatched;
    java.util.List<CertificationScopeResponse> scopes;
    Integer missingMandatoryEvidenceCount;
    java.util.List<org.example.farm.dto.response.CertificationDetailsResponse.MissingEvidenceItem> missingEvidenceItems;
}
