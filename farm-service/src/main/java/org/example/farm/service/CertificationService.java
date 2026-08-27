package org.example.farm.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.farm.dto.request.UpdateCertificationItemRequest;
import org.example.farm.dto.request.UpdateCertificationScopesRequest;
import org.example.farm.dto.response.CertificationDetailsResponse;
import org.example.farm.dto.response.CertificationDetailsResponse.CertificationItemDetail;
import org.example.farm.dto.response.CertificationScopeResponse;
import org.example.farm.client.CropCatalogClient;
import org.example.farm.client.SeasonServiceClient;
import org.example.farm.entity.*;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class CertificationService {

    public static final String DEFAULT_STANDARD_CODE = "VIETGAP-PLANTING-2026";
    private static final String LEGACY_STANDARD_CODE = "VIETGAP-PLANTING-2024";
    private static final BigDecimal MINIMUM_COMPLIANCE_SCORE = BigDecimal.valueOf(80);

    private final CertificationStandardRepository standardRepository;
    private final CertificationChecklistItemRepository checklistItemRepository;
    private final CertificationRecordRepository recordRepository;
    private final CertificationItemStatusRepository itemStatusRepository;
    private final CertificationScoringService scoringService;
    private final FarmRepository farmRepository;
    private final CertificationScopeRepository scopeRepository;
    private final PlotRepository plotRepository;
    private final SeasonServiceClient seasonServiceClient;
    private final CropCatalogClient cropCatalogClient;

    /**
     * Backward-compatible: mặc định VietGAP.
     */
    public CertificationRecord getOrCreateRecord(Integer farmId) {
        return getOrCreateRecord(farmId, DEFAULT_STANDARD_CODE);
    }

    /**
     * Hỗ trợ đa chuẩn: VietGAP, Organic, GlobalGAP... (§5.7/5.9 BRD)
     */
    public CertificationRecord getOrCreateRecord(Integer farmId, String standardCode) {
        // Kiểm tra farm có tồn tại không
        farmRepository.findById(farmId)
                .orElseThrow(() -> new AppException(ErrorCode.FARM_NOT_FOUND));

        String normalizedStandardCode = LEGACY_STANDARD_CODE.equals(standardCode)
                ? DEFAULT_STANDARD_CODE
                : standardCode;
        CertificationStandard standard = standardRepository.findByCode(normalizedStandardCode)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST));

        Optional<CertificationRecord> recordOpt = recordRepository.findByFarmIdAndStandardId(farmId, standard.getId());
        if (recordOpt.isPresent()) {
            return recordOpt.get();
        }

        // Tạo bản ghi chứng nhận mới
        CertificationRecord record = CertificationRecord.builder()
                .farmId(farmId)
                .standardId(standard.getId())
                .complianceScore(BigDecimal.ZERO)
                .status("IN_PROGRESS")
                .build();
        record = recordRepository.save(record);

        // Tạo item statuses cho tất cả checklist items
        List<CertificationChecklistItem> items = checklistItemRepository.findByStandardId(standard.getId());
        List<CertificationItemStatus> statuses = new ArrayList<>();
        for (CertificationChecklistItem item : items) {
            CertificationItemStatus status = CertificationItemStatus.builder()
                    .recordId(record.getId())
                    .checklistItemId(item.getId())
                    .status("PENDING")
                    .build();
            statuses.add(status);
        }
        itemStatusRepository.saveAll(statuses);

        return record;
    }

    public CertificationDetailsResponse getCertificationDetails(Integer farmId) {
        return getCertificationDetails(farmId, DEFAULT_STANDARD_CODE);
    }

    public CertificationDetailsResponse getCertificationDetails(Integer farmId, String standardCode) {
        CertificationRecord record = getOrCreateRecord(farmId, standardCode);
        List<CertificationItemStatus> statuses = itemStatusRepository.findByRecordId(record.getId());
        List<CertificationChecklistItem> items = checklistItemRepository.findByStandardId(record.getStandardId());
        List<CertificationScope> scopes = scopeRepository.findByRecordIdOrderById(record.getId());

        // Tự động điền (auto-populate) từ logs, tests, PHI check
        scoringService.autoPopulateFromSeasonIds(
                scopes.stream().map(CertificationScope::getSeasonId).distinct().toList(), statuses, items);
        itemStatusRepository.saveAll(statuses);

        // Tính toán lại compliance score
        BigDecimal score = scoringService.calculateScore(statuses, items);
        record.setComplianceScore(score);

        boolean eligible = !scopes.isEmpty() && isEligibleForApplication(score, statuses, items);
        updateReadinessStatus(record, eligible);
        refreshDateBasedLifecycleStatus(record);
        recordRepository.save(record);

        CertificationStandard standard = standardRepository.findById(record.getStandardId()).orElse(null);

        List<CertificationItemDetail> itemDetails = new ArrayList<>();
        for (CertificationChecklistItem item : items) {
            CertificationItemStatus status = statuses.stream()
                    .filter(s -> s.getChecklistItemId().equals(item.getId()))
                    .findFirst().orElse(null);

            itemDetails.add(CertificationItemDetail.builder()
                    .id(item.getId())
                    .itemCode(item.getItemCode())
                    .category(item.getCategory())
                    .description(item.getDescription())
                    .isMandatory(item.getIsMandatory())
                    .weightPct(item.getWeightPct())
                    .dataSourceType(item.getDataSourceType())
                    .dataSourceQuery(item.getDataSourceQuery())
                    .status(status != null ? status.getStatus() : "PENDING")
                    .evidenceUrl(status != null ? status.getEvidenceUrl() : null)
                    .notes(status != null ? status.getNotes() : null)
                    .checkedAt(status != null ? status.getCheckedAt() : null)
                    .build());
        }

        // Tính missing evidence (§8.4 BRD)
        List<CertificationDetailsResponse.MissingEvidenceItem> missingItems = new ArrayList<>();
        for (CertificationChecklistItem item : items) {
            if (!Boolean.TRUE.equals(item.getIsMandatory())) continue;
            CertificationItemStatus itemStatus = statuses.stream()
                    .filter(s -> s.getChecklistItemId().equals(item.getId()))
                    .findFirst().orElse(null);
            if (itemStatus == null || !"PASS".equalsIgnoreCase(itemStatus.getStatus())) {
                missingItems.add(CertificationDetailsResponse.MissingEvidenceItem.builder()
                        .itemCode(item.getItemCode())
                        .category(item.getCategory())
                        .description(item.getDescription())
                        .build());
            }
        }

        return CertificationDetailsResponse.builder()
                .recordId(record.getId())
                .farmId(record.getFarmId())
                .standardCode(standard != null ? standard.getCode() : "")
                .standardName(standard != null ? standard.getName() : "")
                .complianceScore(record.getComplianceScore())
                .status(record.getStatus())
                .appliedAt(record.getAppliedAt())
                .certifiedAt(record.getCertifiedAt())
                .expiryDate(record.getExpiryDate())
                .auditorNotes(record.getAuditorNotes())
                .scopes(scopes.stream().map(this::toScopeResponse).toList())
                .items(itemDetails)
                .isEligible(eligible)
                .certificateNumber(record.getCertificateNumber())
                .nextPeriodicReviewDate(record.getNextPeriodicReviewDate())
                .publishedAt(record.getPublishedAt())
                .missingMandatoryEvidenceCount(missingItems.size())
                .missingEvidenceItems(missingItems)
                .build();
    }

    public void updateItemStatus(Integer farmId, Integer itemId, UpdateCertificationItemRequest req) {
        CertificationRecord record = getOrCreateRecord(farmId);
        CertificationItemStatus status = itemStatusRepository.findByRecordIdAndChecklistItemId(record.getId(), itemId)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST));

        if (req.getStatus() != null) {
            status.setStatus(req.getStatus().toUpperCase());
        }
        if (req.getEvidenceUrl() != null) {
            status.setEvidenceUrl(req.getEvidenceUrl());
        }
        if (req.getNotes() != null) {
            status.setNotes(req.getNotes());
        }
        status.setCheckedAt(LocalDateTime.now());
        itemStatusRepository.save(status);

        // Tính toán lại điểm số
        List<CertificationItemStatus> statuses = itemStatusRepository.findByRecordId(record.getId());
        List<CertificationChecklistItem> items = checklistItemRepository.findByStandardId(record.getStandardId());
        BigDecimal score = scoringService.calculateScore(statuses, items);
        record.setComplianceScore(score);

        boolean hasScope = !scopeRepository.findByRecordIdOrderById(record.getId()).isEmpty();
        updateReadinessStatus(record, hasScope && isEligibleForApplication(score, statuses, items));
        recordRepository.save(record);
    }

    public List<CertificationScopeResponse> updateScopes(
            Integer farmId, UpdateCertificationScopesRequest request) {
        CertificationRecord record = getOrCreateRecord(farmId);
        if (!List.of("IN_PROGRESS", "READY_TO_APPLY").contains(record.getStatus())) {
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
        }

        List<Integer> seasonIds = request.getScopes().stream()
                .map(UpdateCertificationScopesRequest.ScopeItem::getSeasonId)
                .toList();
        if (seasonIds.stream().distinct().count() != seasonIds.size()) {
            throw new IllegalArgumentException("Mỗi mùa vụ chỉ được khai báo một lần trong phạm vi chứng nhận.");
        }

        List<CertificationScope> verifiedScopes = new ArrayList<>();
        for (UpdateCertificationScopesRequest.ScopeItem requested : request.getScopes()) {
            SeasonServiceClient.SeasonInternalDto season;
            try {
                season = seasonServiceClient.getSeasonInternal(requested.getSeasonId());
            } catch (Exception exception) {
                throw new AppException(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE);
            }
            if (season == null || season.getPlotId() == null || season.getCropId() == null) {
                throw new IllegalArgumentException("Mùa vụ không tồn tại hoặc thiếu thông tin cây trồng/thửa đất.");
            }

            Plot plot = plotRepository.findById(season.getPlotId())
                    .filter(candidate -> candidate.getFarm() != null
                            && farmId.equals(candidate.getFarm().getId()))
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Mùa vụ không thuộc thửa đất của nông trại đang đăng ký."));
            if (plot.getArea() == null
                    || requested.getRegisteredAreaHa().compareTo(plot.getArea()) > 0) {
                throw new IllegalArgumentException(
                        "Diện tích đăng ký phải nhỏ hơn hoặc bằng diện tích thửa đất " + plot.getPlotName() + ".");
            }

            CropCatalogClient.CropDto crop;
            CropCatalogClient.VarietyDto variety = null;
            try {
                crop = cropCatalogClient.getCrop(season.getCropId());
                if (season.getVarietyId() != null) {
                    variety = cropCatalogClient.getVariety(season.getVarietyId());
                }
            } catch (Exception exception) {
                throw new AppException(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE);
            }
            if (crop == null || crop.getCropName() == null
                    || (variety != null && !season.getCropId().equals(variety.getCropId()))) {
                throw new IllegalArgumentException("Danh mục cây trồng/giống của mùa vụ không hợp lệ.");
            }

            verifiedScopes.add(CertificationScope.builder()
                    .recordId(record.getId())
                    .seasonId(season.getId())
                    .plotId(plot.getId())
                    .plotName(plot.getPlotName())
                    .cropId(crop.getId())
                    .cropName(crop.getCropName())
                    .varietyId(variety != null ? variety.getId() : null)
                    .varietyName(variety != null ? variety.getName() : null)
                    .registeredAreaHa(requested.getRegisteredAreaHa())
                    .expectedYieldKg(season.getExpectedYieldKg())
                    .build());
        }

        scopeRepository.deleteByRecordId(record.getId());
        scopeRepository.flush();
        List<CertificationScope> saved = scopeRepository.saveAll(verifiedScopes);

        List<CertificationItemStatus> statuses = itemStatusRepository.findByRecordId(record.getId());
        List<CertificationChecklistItem> items = checklistItemRepository.findByStandardId(record.getStandardId());
        BigDecimal currentScore = record.getComplianceScore() != null
                ? record.getComplianceScore() : BigDecimal.ZERO;
        updateReadinessStatus(record,
                isEligibleForApplication(currentScore, statuses, items));
        recordRepository.save(record);
        return saved.stream().map(this::toScopeResponse).toList();
    }

    public void apply(Integer farmId) {
        CertificationRecord record = requireVerifiedEvidence(farmId);

        record.setStatus("APPLIED");
        record.setAppliedAt(LocalDateTime.now());
        recordRepository.save(record);
    }

    /**
     * Revalidate auto evidence before a state transition consumes the score.
     * Downstream-unavailable throws a typed 503 and the caller transaction rolls back.
     */
    public CertificationRecord requireVerifiedEvidence(Integer farmId) {
        CertificationRecord record = getOrCreateRecord(farmId);
        List<CertificationScope> scopes = scopeRepository.findByRecordIdOrderById(record.getId());
        if (scopes.isEmpty()) {
            throw new IllegalArgumentException(
                    "Chưa thể đăng ký: phải chọn ít nhất một mùa vụ, sản phẩm và thửa đất thuộc phạm vi chứng nhận.");
        }
        List<CertificationItemStatus> statuses = itemStatusRepository.findByRecordId(record.getId());
        List<CertificationChecklistItem> items = checklistItemRepository.findByStandardId(record.getStandardId());

        scoringService.autoPopulateFromSeasonIds(
                scopes.stream().map(CertificationScope::getSeasonId).distinct().toList(),
                statuses,
                items);
        itemStatusRepository.saveAll(statuses);

        BigDecimal score = scoringService.calculateScore(statuses, items);
        record.setComplianceScore(score);
        if (score.compareTo(MINIMUM_COMPLIANCE_SCORE) < 0) {
            throw new IllegalArgumentException("Không đủ điều kiện: Điểm VietGAP phải đạt ít nhất 80%.");
        }
        if (!haveAllMandatoryItemsPassed(statuses, items)) {
            throw new IllegalArgumentException("Không đủ điều kiện: Tất cả tiêu chí bắt buộc phải được xác minh ĐẠT.");
        }
        return record;
    }

    private boolean isEligibleForApplication(
            BigDecimal score,
            List<CertificationItemStatus> statuses,
            List<CertificationChecklistItem> items) {
        return score.compareTo(MINIMUM_COMPLIANCE_SCORE) >= 0
                && haveAllMandatoryItemsPassed(statuses, items);
    }

    private boolean haveAllMandatoryItemsPassed(
            List<CertificationItemStatus> statuses,
            List<CertificationChecklistItem> items) {
        return items.stream()
                .filter(item -> Boolean.TRUE.equals(item.getIsMandatory()))
                .allMatch(item -> statuses.stream().anyMatch(status ->
                        item.getId().equals(status.getChecklistItemId())
                                && "PASS".equalsIgnoreCase(status.getStatus())));
    }

    private void updateReadinessStatus(CertificationRecord record, boolean eligible) {
        if (eligible && "IN_PROGRESS".equals(record.getStatus())) {
            record.setStatus("READY_TO_APPLY");
        } else if (!eligible && "READY_TO_APPLY".equals(record.getStatus())) {
            record.setStatus("IN_PROGRESS");
        }
    }

    public void refreshDateBasedLifecycleStatus(CertificationRecord record) {
        LocalDate today = LocalDate.now();
        if (record.getExpiryDate() != null
                && record.getExpiryDate().isBefore(today)
                && List.of("CERTIFIED", "PUBLISHED", "PERIODIC_REVIEW_DUE").contains(record.getStatus())) {
            record.setStatus("EXPIRED");
            return;
        }
        if (record.getNextPeriodicReviewDate() != null
                && !record.getNextPeriodicReviewDate().isAfter(today)
                && List.of("CERTIFIED", "PUBLISHED").contains(record.getStatus())) {
            record.setStatus("PERIODIC_REVIEW_DUE");
        }
    }

    public org.example.farm.dto.response.FarmDocumentResponse exportDossier(Integer farmId, org.example.farm.dto.request.ExportDossierRequest request, Long userId, org.example.farm.client.SeasonProductionDiaryClient diaryClient, FarmDocumentService documentService) {
        CertificationDetailsResponse certDetails = getCertificationDetails(farmId);

        StringBuilder dossierContent = new StringBuilder();
        dossierContent.append("=== DOSSIER HỒ SƠ NÔNG TRẠI ===\n");
        dossierContent.append("Farm ID (dossier owner only): ").append(farmId).append("\n");
        dossierContent.append("CERTIFIED PRODUCT / PLOT SCOPE:\n");
        for (CertificationScopeResponse scope : certDetails.getScopes()) {
            dossierContent.append("- ").append(scope.getCropName());
            if (scope.getVarietyName() != null) dossierContent.append(" / ").append(scope.getVarietyName());
            dossierContent.append(" | ").append(scope.getPlotName())
                    .append(" | ").append(scope.getRegisteredAreaHa()).append(" ha")
                    .append(" | Season ID: ").append(scope.getSeasonId()).append("\n");
        }
        dossierContent.append("Chuẩn: ").append(certDetails.getStandardName()).append("\n");
        dossierContent.append("Điểm tuân thủ: ").append(certDetails.getComplianceScore()).append("%\n");
        dossierContent.append("\n=== CHI TIẾT ĐÁNH GIÁ ===\n");
        for (CertificationItemDetail item : certDetails.getItems()) {
            dossierContent.append("[").append(item.getStatus()).append("] ").append(item.getItemCode()).append(" - ").append(item.getDescription()).append("\n");
        }

        dossierContent.append("\n=== NHẬT KÝ SẢN XUẤT ===\n");
        if (certDetails.getScopes() != null) {
            for (Integer seasonId : certDetails.getScopes().stream()
                    .map(CertificationScopeResponse::getSeasonId).distinct().toList()) {
                dossierContent.append("\nMùa vụ ID: ").append(seasonId).append("\n");
                try {
                    List<org.example.farm.client.SeasonProductionDiaryClient.ProductionDiaryEventDto> events = diaryClient.getProductionDiaryInternal(seasonId);
                    if (events == null) {
                        throw new IllegalStateException("Incomplete production diary response");
                    }
                    for (var event : events) {
                        dossierContent.append(event.getEventDate()).append(" |")
                                .append(event.getEventType()).append("| ")
                                .append(event.getTitle()).append(" - ")
                                .append(event.getDescription()).append("\n");
                    }
                } catch (Exception e) {
                    throw new org.example.farm.exception.AppException(
                            org.example.farm.exception.ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE);
                }
            }
        }

        // Vì MVP không có thư viện PDF và MinIO upload logic chi tiết ở đây (chưa tiêm MinioService),
        // ta tạo file JSON/Text lưu trữ trong fileUrl (dạng Data URI hoặc Minio link giả định).
        // Thực tế sẽ dùng MinioService để upload byte[] dossierContent.toString().getBytes().
        String base64Content = java.util.Base64.getEncoder().encodeToString(dossierContent.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String fileUrl = "data:text/plain;base64," + base64Content; 

        org.example.farm.dto.request.FarmDocumentCreateRequest docReq = new org.example.farm.dto.request.FarmDocumentCreateRequest(
                "EXPORTED_DOSSIER", "Hồ sơ xuất tự động (Dossier)", "Tổng hợp đánh giá VietGAP và nhật ký sản xuất", fileUrl, java.time.LocalDate.now(), null
        );
        return documentService.create(farmId, userId, docReq);
    }

    private CertificationScopeResponse toScopeResponse(CertificationScope scope) {
        return CertificationScopeResponse.builder()
                .id(scope.getId())
                .seasonId(scope.getSeasonId())
                .plotId(scope.getPlotId())
                .plotName(scope.getPlotName())
                .cropId(scope.getCropId())
                .cropName(scope.getCropName())
                .varietyId(scope.getVarietyId())
                .varietyName(scope.getVarietyName())
                .registeredAreaHa(scope.getRegisteredAreaHa())
                .expectedYieldKg(scope.getExpectedYieldKg())
                .build();
    }
}
