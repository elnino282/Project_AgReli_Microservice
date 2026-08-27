package org.example.farm.controller;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.example.farm.entity.Farm;
import org.example.farm.entity.CertificationRecord;
import org.example.farm.entity.CertificationStandard;
import org.example.farm.repository.FarmRepository;
import org.example.farm.repository.CertificationRecordRepository;
import org.example.farm.repository.CertificationStandardRepository;
import org.example.farm.mapper.FarmMapper;
import org.example.farm.dto.response.CertificationInfoDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/internal/farms")
@RequiredArgsConstructor
public class InternalFarmController {

    private final FarmRepository farmRepository;
    private final FarmMapper farmMapper;
    private final CertificationRecordRepository certificationRecordRepository;
    private final CertificationStandardRepository certificationStandardRepository;
    private final org.example.farm.service.CertificationService certificationService;

    @PostMapping("/batch")
    public ResponseEntity<List<FarmSummaryDto>> getFarmsByIds(@RequestBody List<Integer> farmIds) {
        List<Farm> farms = farmRepository.findAllById(farmIds);
        List<FarmSummaryDto> dtos = farms.stream()
                .map(farmMapper::toSummaryDto)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{farmId}")
    public ResponseEntity<FarmDetailDto> getFarmDetail(@PathVariable Integer farmId) {
        return farmRepository.findById(farmId)
                .map(farmMapper::toDetailDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{farmId}/certification")
    public ResponseEntity<CertificationInfoDto> getFarmCertification(
            @PathVariable Integer farmId,
            @RequestParam(value = "standardCode", defaultValue = "VIETGAP-PLANTING-2026") String standardCode,
            @RequestParam(value = "seasonId", required = false) Integer seasonId) {
        Optional<CertificationStandard> standardOpt = certificationStandardRepository.findByCode(standardCode);
        if (standardOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        CertificationStandard standard = standardOpt.get();
        Optional<CertificationRecord> recordOpt = certificationRecordRepository.findByFarmIdAndStandardId(farmId, standard.getId());
        
        if (recordOpt.isEmpty()) {
            return ResponseEntity.ok(CertificationInfoDto.builder()
                    .certificationName(standard.getName())
                    .certificationType(standard.getType())
                    .status("IN_PROGRESS")
                    .scopeMatched(false)
                    .scopes(List.of())
                    .complianceScore(java.math.BigDecimal.ZERO)
                    .build());
        }

        // Dùng service để tự động tính điểm và lấy missing evidence
        org.example.farm.dto.response.CertificationDetailsResponse details = certificationService.getCertificationDetails(farmId, standardCode);

        CertificationRecord record = recordOpt.get();
        List<org.example.farm.dto.response.CertificationScopeResponse> scopes = details.getScopes();
        boolean scopeMatched = seasonId != null && scopes.stream()
                .anyMatch(scope -> seasonId.equals(scope.getSeasonId()));
        return ResponseEntity.ok(CertificationInfoDto.builder()
                .certificationName(standard.getName())
                .certificationType(standard.getType())
                .status(scopeMatched ? details.getStatus() : "OUT_OF_SCOPE")
                .issuedDate(details.getCertifiedAt() != null ? details.getCertifiedAt().toLocalDate() : null)
                .expiryDate(details.getExpiryDate())
                .complianceScore(details.getComplianceScore())
                .certificateNumber(details.getCertificateNumber())
                .scopeMatched(scopeMatched)
                .scopes(scopes)
                .missingMandatoryEvidenceCount(details.getMissingMandatoryEvidenceCount())
                .missingEvidenceItems(details.getMissingEvidenceItems())
                .build());
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FarmSummaryDto {
        private Integer id;
        private String name;
        private String provinceName;
        private String wardName;
        private java.math.BigDecimal area;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FarmDetailDto {
        private Integer id;
        private String name;
        private String provinceName;
        private String wardName;
        private java.math.BigDecimal area;
        private java.math.BigDecimal latitude;
        private java.math.BigDecimal longitude;
        private Double averageRating;
        private Long userId;
    }
}
