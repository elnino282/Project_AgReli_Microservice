package org.example.farm.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CertificationAuditResponse {
    Long id;
    Integer recordId;
    Integer farmId;
    String farmName;
    String standardCode;
    BigDecimal complianceScore;
    String recordStatus;
    String auditType;
    LocalDate scheduledDate;
    Long auditorUserId;
    String auditorOrgName;
    String status;
    String interviewNotes;
    String sampleCollectionNotes;
    LocalDateTime conductedAt;
    LocalDateTime createdAt;
    List<NonconformityResponse> nonconformities;
}

