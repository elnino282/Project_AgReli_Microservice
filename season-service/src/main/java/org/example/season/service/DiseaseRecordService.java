package org.example.season.service;

import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.season.dto.common.PageResponse;
import org.example.season.enums.DiseaseSeverity;
import org.example.season.enums.DiseaseStatus;
import org.example.season.enums.SeasonStatus;
import org.example.season.enums.TreatmentEffectiveness;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.example.season.dto.request.CreateDiseaseRecordRequest;
import org.example.season.dto.request.CreateDiseaseTreatmentRequest;
import org.example.season.dto.request.UpdateDiseaseRecordRequest;
import org.example.season.dto.request.UpdateDiseaseTreatmentRequest;
import org.example.season.dto.response.DiseaseRecordDetailResponse;
import org.example.season.dto.response.DiseaseRecordResponse;
import org.example.season.dto.response.DiseaseTreatmentResponse;
import org.example.season.entity.DiseaseRecord;
import org.example.season.entity.DiseaseTreatment;
import org.example.season.entity.Season;
import org.example.season.mapper.DiseaseRecordMapper;
import org.example.season.repository.DiseaseRecordRepository;
import org.example.season.repository.DiseaseTreatmentRepository;
import org.example.season.repository.SeasonRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Transactional
@Slf4j
public class DiseaseRecordService {

    DiseaseRecordRepository diseaseRecordRepository;
    DiseaseTreatmentRepository diseaseTreatmentRepository;
    SeasonRepository seasonRepository;
    SeasonWorkspaceAccessService seasonWorkspaceAccessService;
    ExternalServiceClient externalServiceClient;
    AuditLogService auditLogService;
    DiseaseRecordMapper diseaseRecordMapper;
    org.example.season.client.AiServiceClient aiServiceClient;
    com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public PageResponse<DiseaseRecordResponse> listDiseaseRecordsBySeason(
            Integer seasonId,
            String status,
            String severity,
            String q,
            LocalDate fromDetectedAt,
            LocalDate toDetectedAt,
            int page,
            int size) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        return listDiseaseRecordsForResolvedSeason(
                season,
                status,
                severity,
                q,
                fromDetectedAt,
                toDetectedAt,
                page,
                size);
    }

    @Transactional(readOnly = true)
    public PageResponse<DiseaseRecordResponse> listDiseaseRecordsByAssignedEmployeeSeason(
            Integer seasonId,
            String status,
            String severity,
            String q,
            LocalDate fromDetectedAt,
            LocalDate toDetectedAt,
            int page,
            int size) {
        Season season = getSeasonForCurrentEmployee(seasonId);
        return listDiseaseRecordsForResolvedSeason(
                season,
                status,
                severity,
                q,
                fromDetectedAt,
                toDetectedAt,
                page,
                size);
    }

    private PageResponse<DiseaseRecordResponse> listDiseaseRecordsForResolvedSeason(
            Season season,
            String status,
            String severity,
            String q,
            LocalDate fromDetectedAt,
            LocalDate toDetectedAt,
            int page,
            int size) {
        Specification<DiseaseRecord> spec = buildRecordSpecification(
                season.getId(),
                status,
                severity,
                q,
                fromDetectedAt,
                toDetectedAt);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("detectedAt"), Sort.Order.desc("id")));
        Page<DiseaseRecord> diseasePage = diseaseRecordRepository.findAll(spec, pageable);

        List<DiseaseRecordResponse> items = diseasePage.getContent()
                .stream()
                .map(record -> {
                    long treatmentCount = diseaseTreatmentRepository.countByDiseaseRecordId(record.getId());
                    LocalDateTime latestTreatmentAt = diseaseTreatmentRepository
                            .findLatestTreatedAtByDiseaseRecordId(record.getId());
                    return diseaseRecordMapper.toDiseaseRecordResponse(record, treatmentCount, latestTreatmentAt);
                })
                .toList();

        return PageResponse.of(diseasePage, items);
    }

    @Transactional(readOnly = true)
    public DiseaseRecordDetailResponse getDiseaseRecordDetail(Integer id) {
        DiseaseRecord diseaseRecord = getDiseaseRecordForCurrentFarmer(id);
        return getDiseaseRecordDetailForResolvedRecord(diseaseRecord);
    }

    @Transactional(readOnly = true)
    public DiseaseRecordDetailResponse getDiseaseRecordDetailForAssignedEmployee(Integer id) {
        DiseaseRecord diseaseRecord = getDiseaseRecordForCurrentEmployee(id);
        return getDiseaseRecordDetailForResolvedRecord(diseaseRecord);
    }

    private DiseaseRecordDetailResponse getDiseaseRecordDetailForResolvedRecord(DiseaseRecord diseaseRecord) {
        Integer id = diseaseRecord.getId();
        List<DiseaseTreatmentResponse> treatments = diseaseTreatmentRepository
                .findAllByDiseaseRecordIdOrderByTreatedAtDescIdDesc(id)
                .stream()
                .map(diseaseRecordMapper::toDiseaseTreatmentResponse)
                .toList();

        Long treatmentCount = diseaseTreatmentRepository.countByDiseaseRecordId(id);
        LocalDateTime latestTreatmentAt = diseaseTreatmentRepository.findLatestTreatedAtByDiseaseRecordId(id);
        BigDecimal totalTreatmentCost = diseaseTreatmentRepository.sumCostAmountByDiseaseRecordId(id);

        return diseaseRecordMapper.toDiseaseRecordDetailResponse(
                diseaseRecord,
                treatments,
                treatmentCount,
                latestTreatmentAt,
                totalTreatmentCost);
    }

    public DiseaseRecordResponse createDiseaseRecord(Integer seasonId, CreateDiseaseRecordRequest request) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        return createDiseaseRecordForResolvedSeason(season, request);
    }

    public DiseaseRecordResponse createDiseaseRecordForAssignedEmployee(Integer seasonId, CreateDiseaseRecordRequest request) {
        Season season = getSeasonForCurrentEmployee(seasonId);
        return createDiseaseRecordForResolvedSeason(season, request);
    }

    private DiseaseRecordResponse createDiseaseRecordForResolvedSeason(Season season, CreateDiseaseRecordRequest request) {
        ensureSeasonOpenForDiseaseWrite(season, true);
        validateDetectedAtWithinSeason(season, request.getDetectedAt());

        DiseaseSeverity diseaseSeverity = parseSeverity(request.getSeverity());
        DiseaseStatus diseaseStatus = StringUtils.hasText(request.getStatus())
                ? parseStatus(request.getStatus())
                : DiseaseStatus.OPEN;

        if (!StringUtils.hasText(request.getDiseaseName())) {
            throw new AppException(ErrorCode.KEY_INVALID);
        }

        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();

        Integer resolvedIncidentId = null;
        if (request.getIncidentId() != null) {
            ExternalServiceClient.ValidationResultDto val = externalServiceClient.validateIncidentSeason(request.getIncidentId(), season.getId());
            if (!val.isValid()) {
                if ("INCIDENT_NOT_FOUND".equals(val.getErrorCode())) {
                    throw new AppException(ErrorCode.INCIDENT_NOT_FOUND);
                }
                throw new AppException(ErrorCode.DISEASE_REFERENCE_SEASON_MISMATCH);
            }
            resolvedIncidentId = request.getIncidentId();
        }

        DiseaseRecord diseaseRecord = DiseaseRecord.builder()
                .season(season)
                .plotId(season.getPlotId())
                .cropId(season.getCropId())
                .varietyId(season.getVarietyId())
                .reportedByUserId(currentUser.getId())
                .incidentId(resolvedIncidentId)
                .diseaseName(request.getDiseaseName().trim())
                .symptomSummary(trimToNull(request.getSymptomSummary()))
                .severity(diseaseSeverity)
                .status(diseaseStatus)
                .detectedAt(request.getDetectedAt())
                .affectedPlantCount(request.getAffectedPlantCount())
                .affectedAreaValue(request.getAffectedAreaValue())
                .affectedAreaUnit(trimToNull(request.getAffectedAreaUnit()))
                .evidenceUrl(trimToNull(request.getEvidenceUrl()))
                .notes(trimToNull(request.getNotes()))
                .build();

        DiseaseRecord saved = diseaseRecordRepository.save(diseaseRecord);
        logRecordAudit("DISEASE_RECORD_CREATED", saved);
        return diseaseRecordMapper.toDiseaseRecordResponse(saved, 0L, null);
    }

    public DiseaseRecordResponse updateDiseaseRecord(Integer id, UpdateDiseaseRecordRequest request) {
        DiseaseRecord diseaseRecord = getDiseaseRecordForCurrentFarmer(id);
        return updateResolvedDiseaseRecord(diseaseRecord, request);
    }

    public DiseaseRecordResponse updateDiseaseRecordForAssignedEmployee(Integer id, UpdateDiseaseRecordRequest request) {
        DiseaseRecord diseaseRecord = getDiseaseRecordForCurrentEmployee(id);
        seasonWorkspaceAccessService.assertCurrentUserCanManageRecord(
                resolveSeasonOfRecord(diseaseRecord),
                diseaseRecord.getReportedByUserId());
        return updateResolvedDiseaseRecord(diseaseRecord, request);
    }

    private DiseaseRecordResponse updateResolvedDiseaseRecord(DiseaseRecord diseaseRecord, UpdateDiseaseRecordRequest request) {
        Season season = resolveSeasonOfRecord(diseaseRecord);
        ensureSeasonOpenForDiseaseWrite(season, false);

        if (request.getDiseaseName() != null) {
            if (!StringUtils.hasText(request.getDiseaseName())) {
                throw new AppException(ErrorCode.KEY_INVALID);
            }
            diseaseRecord.setDiseaseName(request.getDiseaseName().trim());
        }

        if (request.getSymptomSummary() != null) {
            diseaseRecord.setSymptomSummary(trimToNull(request.getSymptomSummary()));
        }

        if (request.getSeverity() != null) {
            diseaseRecord.setSeverity(parseSeverity(request.getSeverity()));
        }

        if (request.getStatus() != null) {
            diseaseRecord.setStatus(parseStatus(request.getStatus()));
        }

        if (request.getDetectedAt() != null) {
            validateDetectedAtWithinSeason(season, request.getDetectedAt());
            diseaseRecord.setDetectedAt(request.getDetectedAt());
        }

        if (request.getAffectedPlantCount() != null) {
            diseaseRecord.setAffectedPlantCount(request.getAffectedPlantCount());
        }

        if (request.getAffectedAreaValue() != null) {
            diseaseRecord.setAffectedAreaValue(request.getAffectedAreaValue());
        }

        if (request.getAffectedAreaUnit() != null) {
            diseaseRecord.setAffectedAreaUnit(trimToNull(request.getAffectedAreaUnit()));
        }

        if (request.getEvidenceUrl() != null) {
            diseaseRecord.setEvidenceUrl(trimToNull(request.getEvidenceUrl()));
        }

        if (request.getNotes() != null) {
            diseaseRecord.setNotes(trimToNull(request.getNotes()));
        }

        if (request.getIncidentId() != null) {
            ExternalServiceClient.ValidationResultDto val = externalServiceClient.validateIncidentSeason(request.getIncidentId(), season.getId());
            if (!val.isValid()) {
                if ("INCIDENT_NOT_FOUND".equals(val.getErrorCode())) {
                    throw new AppException(ErrorCode.INCIDENT_NOT_FOUND);
                }
                throw new AppException(ErrorCode.DISEASE_REFERENCE_SEASON_MISMATCH);
            }
            diseaseRecord.setIncidentId(request.getIncidentId());
        }

        DiseaseRecord saved = diseaseRecordRepository.save(diseaseRecord);
        logRecordAudit("DISEASE_RECORD_UPDATED", saved);

        long treatmentCount = diseaseTreatmentRepository.countByDiseaseRecordId(saved.getId());
        LocalDateTime latestTreatmentAt = diseaseTreatmentRepository.findLatestTreatedAtByDiseaseRecordId(saved.getId());
        return diseaseRecordMapper.toDiseaseRecordResponse(saved, treatmentCount, latestTreatmentAt);
    }

    public void deleteDiseaseRecord(Integer id) {
        DiseaseRecord diseaseRecord = getDiseaseRecordForCurrentFarmer(id);
        deleteResolvedDiseaseRecord(diseaseRecord);
    }

    public void deleteDiseaseRecordForAssignedEmployee(Integer id) {
        DiseaseRecord diseaseRecord = getDiseaseRecordForCurrentEmployee(id);
        seasonWorkspaceAccessService.assertCurrentUserCanManageRecord(
                resolveSeasonOfRecord(diseaseRecord),
                diseaseRecord.getReportedByUserId());
        deleteResolvedDiseaseRecord(diseaseRecord);
    }

    private void deleteResolvedDiseaseRecord(DiseaseRecord diseaseRecord) {
        Season season = resolveSeasonOfRecord(diseaseRecord);
        ensureSeasonOpenForDiseaseWrite(season, false);

        diseaseTreatmentRepository.deleteAllByDiseaseRecordId(diseaseRecord.getId());
        diseaseRecordRepository.delete(diseaseRecord);
        logRecordAudit("DISEASE_RECORD_DELETED", diseaseRecord);
    }

    @Transactional(readOnly = true)
    public PageResponse<DiseaseTreatmentResponse> listTreatments(Integer diseaseRecordId, int page, int size) {
        getDiseaseRecordForCurrentFarmer(diseaseRecordId);
        return listTreatmentsForResolvedRecord(diseaseRecordId, page, size);
    }

    @Transactional(readOnly = true)
    public PageResponse<DiseaseTreatmentResponse> listTreatmentsForAssignedEmployee(Integer diseaseRecordId, int page, int size) {
        getDiseaseRecordForCurrentEmployee(diseaseRecordId);
        return listTreatmentsForResolvedRecord(diseaseRecordId, page, size);
    }

    private PageResponse<DiseaseTreatmentResponse> listTreatmentsForResolvedRecord(Integer diseaseRecordId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("treatedAt"), Sort.Order.desc("id")));
        Page<DiseaseTreatment> treatmentPage = diseaseTreatmentRepository.findAllByDiseaseRecordId(diseaseRecordId, pageable);

        List<DiseaseTreatmentResponse> items = treatmentPage.getContent()
                .stream()
                .map(diseaseRecordMapper::toDiseaseTreatmentResponse)
                .toList();

        return PageResponse.of(treatmentPage, items);
    }

    public DiseaseTreatmentResponse createTreatment(Integer diseaseRecordId, CreateDiseaseTreatmentRequest request) {
        DiseaseRecord diseaseRecord = getDiseaseRecordForCurrentFarmer(diseaseRecordId);
        return createTreatmentForResolvedRecord(diseaseRecord, request);
    }

    public DiseaseTreatmentResponse createTreatmentForAssignedEmployee(Integer diseaseRecordId, CreateDiseaseTreatmentRequest request) {
        DiseaseRecord diseaseRecord = getDiseaseRecordForCurrentEmployee(diseaseRecordId);
        return createTreatmentForResolvedRecord(diseaseRecord, request);
    }

    private DiseaseTreatmentResponse createTreatmentForResolvedRecord(
            DiseaseRecord diseaseRecord,
            CreateDiseaseTreatmentRequest request) {
        Season season = resolveSeasonOfRecord(diseaseRecord);
        ensureSeasonOpenForDiseaseWrite(season, false);
        validateTreatmentDate(diseaseRecord, request.getTreatedAt());

        if (!StringUtils.hasText(request.getMethod())) {
            throw new AppException(ErrorCode.KEY_INVALID);
        }

        ResolvedSupplyReference resolvedSupplyReference = resolveSupplyReference(
                request.getSupplyItemId(),
                request.getSupplyLotId(),
                season);

        Integer expenseId = null;
        if (request.getExpenseId() != null) {
            ExternalServiceClient.ValidationResultDto val = externalServiceClient.validateExpenseSeason(request.getExpenseId(), diseaseRecord.getSeason().getId());
            if (!val.isValid()) {
                if ("EXPENSE_NOT_FOUND".equals(val.getErrorCode())) {
                    throw new AppException(ErrorCode.EXPENSE_NOT_FOUND);
                }
                throw new AppException(ErrorCode.DISEASE_REFERENCE_SEASON_MISMATCH);
            }
            expenseId = request.getExpenseId();
        }

        TreatmentEffectiveness effectiveness = null;
        if (StringUtils.hasText(request.getEffectiveness())) {
            effectiveness = parseEffectiveness(request.getEffectiveness());
        }

        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();

        DiseaseTreatment treatment = DiseaseTreatment.builder()
                .diseaseRecord(diseaseRecord)
                .treatedAt(request.getTreatedAt())
                .method(request.getMethod().trim())
                .supplyItemId(resolvedSupplyReference.supplyItemId())
                .supplyLotId(resolvedSupplyReference.supplyLotId())
                .materialName(trimToNull(request.getMaterialName()))
                .quantityUsed(request.getQuantityUsed())
                .unit(trimToNull(request.getUnit()))
                .costAmount(request.getCostAmount())
                .expenseId(expenseId)
                .effectiveness(effectiveness)
                .resultSummary(trimToNull(request.getResultSummary()))
                .nextReviewAt(request.getNextReviewAt())
                .notes(trimToNull(request.getNotes()))
                .createdByUserId(currentUser.getId())
                .build();

        DiseaseTreatment saved = diseaseTreatmentRepository.save(treatment);
        logTreatmentAudit("DISEASE_TREATMENT_CREATED", saved);
        return diseaseRecordMapper.toDiseaseTreatmentResponse(saved);
    }

    public DiseaseTreatmentResponse updateTreatment(Integer id, UpdateDiseaseTreatmentRequest request) {
        DiseaseTreatment treatment = getDiseaseTreatmentForCurrentFarmer(id);
        return updateResolvedTreatment(treatment, request);
    }

    public DiseaseTreatmentResponse updateTreatmentForAssignedEmployee(Integer id, UpdateDiseaseTreatmentRequest request) {
        DiseaseTreatment treatment = getDiseaseTreatmentForCurrentEmployee(id);
        seasonWorkspaceAccessService.assertCurrentUserCanManageRecord(
                resolveSeasonOfRecord(treatment.getDiseaseRecord()),
                treatment.getCreatedByUserId());
        return updateResolvedTreatment(treatment, request);
    }

    private DiseaseTreatmentResponse updateResolvedTreatment(DiseaseTreatment treatment, UpdateDiseaseTreatmentRequest request) {
        DiseaseRecord diseaseRecord = treatment.getDiseaseRecord();
        Season season = resolveSeasonOfRecord(diseaseRecord);
        ensureSeasonOpenForDiseaseWrite(season, false);

        if (request.getTreatedAt() != null) {
            validateTreatmentDate(diseaseRecord, request.getTreatedAt());
            treatment.setTreatedAt(request.getTreatedAt());
        }

        if (request.getMethod() != null) {
            if (!StringUtils.hasText(request.getMethod())) {
                throw new AppException(ErrorCode.KEY_INVALID);
            }
            treatment.setMethod(request.getMethod().trim());
        }

        if (request.getSupplyItemId() != null || request.getSupplyLotId() != null) {
            Integer targetSupplyItemId = request.getSupplyItemId() != null
                    ? request.getSupplyItemId()
                    : treatment.getSupplyItemId();
            Integer targetSupplyLotId = request.getSupplyLotId() != null
                    ? request.getSupplyLotId()
                    : treatment.getSupplyLotId();

            ResolvedSupplyReference resolvedSupplyReference = resolveSupplyReference(targetSupplyItemId, targetSupplyLotId, season);
            treatment.setSupplyItemId(resolvedSupplyReference.supplyItemId());
            treatment.setSupplyLotId(resolvedSupplyReference.supplyLotId());
        }

        if (request.getMaterialName() != null) {
            treatment.setMaterialName(trimToNull(request.getMaterialName()));
        }

        if (request.getQuantityUsed() != null) {
            treatment.setQuantityUsed(request.getQuantityUsed());
        }

        if (request.getUnit() != null) {
            treatment.setUnit(trimToNull(request.getUnit()));
        }

        if (request.getCostAmount() != null) {
            treatment.setCostAmount(request.getCostAmount());
        }

        if (request.getExpenseId() != null) {
            ExternalServiceClient.ValidationResultDto val = externalServiceClient.validateExpenseSeason(request.getExpenseId(), diseaseRecord.getSeason().getId());
            if (!val.isValid()) {
                if ("EXPENSE_NOT_FOUND".equals(val.getErrorCode())) {
                    throw new AppException(ErrorCode.EXPENSE_NOT_FOUND);
                }
                throw new AppException(ErrorCode.DISEASE_REFERENCE_SEASON_MISMATCH);
            }
            treatment.setExpenseId(request.getExpenseId());
        }

        if (request.getEffectiveness() != null) {
            treatment.setEffectiveness(parseEffectiveness(request.getEffectiveness()));
        }

        if (request.getResultSummary() != null) {
            treatment.setResultSummary(trimToNull(request.getResultSummary()));
        }

        if (request.getNextReviewAt() != null) {
            treatment.setNextReviewAt(request.getNextReviewAt());
        }

        if (request.getNotes() != null) {
            treatment.setNotes(trimToNull(request.getNotes()));
        }

        DiseaseTreatment saved = diseaseTreatmentRepository.save(treatment);
        logTreatmentAudit("DISEASE_TREATMENT_UPDATED", saved);
        return diseaseRecordMapper.toDiseaseTreatmentResponse(saved);
    }

    public void deleteTreatment(Integer id) {
        DiseaseTreatment treatment = getDiseaseTreatmentForCurrentFarmer(id);
        deleteResolvedTreatment(treatment);
    }

    public void deleteTreatmentForAssignedEmployee(Integer id) {
        DiseaseTreatment treatment = getDiseaseTreatmentForCurrentEmployee(id);
        seasonWorkspaceAccessService.assertCurrentUserCanManageRecord(
                resolveSeasonOfRecord(treatment.getDiseaseRecord()),
                treatment.getCreatedByUserId());
        deleteResolvedTreatment(treatment);
    }

    private void deleteResolvedTreatment(DiseaseTreatment treatment) {
        Season season = resolveSeasonOfRecord(treatment.getDiseaseRecord());
        ensureSeasonOpenForDiseaseWrite(season, false);
        diseaseTreatmentRepository.delete(treatment);
        logTreatmentAudit("DISEASE_TREATMENT_DELETED", treatment);
    }

    public org.example.season.dto.response.DiseaseSuggestionResponse generateAiSuggestion(Integer id, org.example.season.dto.request.DiseaseSuggestionRequest request) {
        DiseaseRecord diseaseRecord = diseaseRecordRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DISEASE_RECORD_NOT_FOUND));
        Season season = resolveSeasonOfRecord(diseaseRecord);
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);
        return generateAiSuggestionInternal(diseaseRecord, season, request);
    }

    public org.example.season.dto.response.DiseaseSuggestionResponse generateAiSuggestionForAssignedEmployee(Integer id, org.example.season.dto.request.DiseaseSuggestionRequest request) {
        DiseaseRecord diseaseRecord = diseaseRecordRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DISEASE_RECORD_NOT_FOUND));
        Season season = resolveSeasonOfRecord(diseaseRecord);
        seasonWorkspaceAccessService.requireActiveEmployeeAssignment(season);
        return generateAiSuggestionInternal(diseaseRecord, season, request);
    }

    private org.example.season.dto.response.DiseaseSuggestionResponse generateAiSuggestionInternal(DiseaseRecord diseaseRecord, Season season, org.example.season.dto.request.DiseaseSuggestionRequest request) {
        String cropName = null;
        try {
            ExternalServiceClient.CropInternalDto crop = externalServiceClient.getCrop(season.getCropId());
            cropName = crop != null ? crop.getCropName() : null;
        } catch (Exception e) {
            log.warn("Failed to fetch crop info for AI suggestion (seasonId={}, cropId={}): {}",
                    season.getId(), season.getCropId(), e.getMessage());
        }

        List<String> availableSupplies = null;
        if (Boolean.TRUE.equals(request.getIncludeInventory())) {
            Integer farmId = seasonWorkspaceAccessService.resolveSeasonFarmId(season);
            try {
                availableSupplies = externalServiceClient.getAvailableSupplyDetails(String.valueOf(farmId)).stream()
                        .map(item -> item.getActiveIngredient() != null && !item.getActiveIngredient().isBlank()
                                ? item.getName() + " (hoạt chất: " + item.getActiveIngredient() + ")"
                                : item.getName())
                        .toList();
            } catch (Exception e) {
                log.warn("Failed to fetch inventory details for AI suggestion (farmId={}): {}", farmId, e.getMessage());
            }
        }

        org.example.season.client.AiServiceClient.InternalDiseaseSuggestionRequest aiRequest = org.example.season.client.AiServiceClient.InternalDiseaseSuggestionRequest.builder()
                .cropName(cropName)
                .diseaseName(diseaseRecord.getDiseaseName())
                .severity(diseaseRecord.getSeverity() != null ? diseaseRecord.getSeverity().name() : null)
                .notes(diseaseRecord.getNotes())
                .availableSupplies(availableSupplies)
                .additionalNote(request.getAdditionalNote())
                .question(request.getQuestion())
                .build();

        org.example.season.dto.common.ApiResponse<String> aiResponse = aiServiceClient.generateDiseaseTreatmentSuggestion(aiRequest);
        GeminiDiseaseSuggestionPayload payload = parseAiSuggestionJson(aiResponse.getData());

        Map<String, Object> contextSummary = new LinkedHashMap<>();
        contextSummary.put("cropName", cropName);
        contextSummary.put("diseaseName", diseaseRecord.getDiseaseName());
        contextSummary.put("includeInventory", request.getIncludeInventory());
        if (availableSupplies != null) {
            contextSummary.put("inventorySuppliesCount", availableSupplies.size());
        }

        String legacyMarkdown = (payload.getSummary() != null ? "**" + payload.getSummary() + "**\n\n" : "")
                + (payload.getUsageInstructions() != null ? payload.getUsageInstructions() + "\n\n" : "")
                + (payload.getSafetyNotes() != null ? "**Lưu ý an toàn:** " + payload.getSafetyNotes() : "");

        return org.example.season.dto.response.DiseaseSuggestionResponse.builder()
                .diseaseRecordId(diseaseRecord.getId())
                .suggestionText(legacyMarkdown)
                .matchedFromInventory(payload.getMatchedFromInventory())
                .matchedSupplyName(payload.getMatchedSupplyName())
                .recommendedProductName(payload.getRecommendedProductName())
                .recommendedActiveIngredient(payload.getRecommendedActiveIngredient())
                .summary(payload.getSummary())
                .safetyNotes(payload.getSafetyNotes())
                .usageInstructions(payload.getUsageInstructions())
                .usedContextSummary(contextSummary)
                .generatedAt(java.time.Instant.now())
                .build();
    }

    private Specification<DiseaseRecord> buildRecordSpecification(
            Integer seasonId,
            String status,
            String severity,
            String q,
            LocalDate fromDetectedAt,
            LocalDate toDetectedAt) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("season").get("id"), seasonId));

            if (StringUtils.hasText(status)) {
                DiseaseStatus diseaseStatus = parseStatus(status);
                predicates.add(cb.equal(root.get("status"), diseaseStatus));
            }

            if (StringUtils.hasText(severity)) {
                DiseaseSeverity diseaseSeverity = parseSeverity(severity);
                predicates.add(cb.equal(root.get("severity"), diseaseSeverity));
            }

            if (StringUtils.hasText(q)) {
                String search = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                Predicate matchName = cb.like(cb.lower(root.get("diseaseName")), search);
                Predicate matchSymptom = cb.like(cb.lower(cb.coalesce(root.get("symptomSummary"), "")), search);
                predicates.add(cb.or(matchName, matchSymptom));
            }

            if (fromDetectedAt != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("detectedAt"), fromDetectedAt.atStartOfDay()));
            }
            if (toDetectedAt != null) {
                predicates.add(cb.lessThan(root.get("detectedAt"), toDetectedAt.plusDays(1).atStartOfDay()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private DiseaseRecord getDiseaseRecordForCurrentFarmer(Integer id) {
        DiseaseRecord diseaseRecord = diseaseRecordRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DISEASE_RECORD_NOT_FOUND));
        Season season = resolveSeasonOfRecord(diseaseRecord);
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);
        return diseaseRecord;
    }

    private DiseaseRecord getDiseaseRecordForCurrentEmployee(Integer id) {
        DiseaseRecord diseaseRecord = diseaseRecordRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DISEASE_RECORD_NOT_FOUND));
        Season season = resolveSeasonOfRecord(diseaseRecord);
        seasonWorkspaceAccessService.requireActiveEmployeeAssignment(season);
        return diseaseRecord;
    }

    private DiseaseTreatment getDiseaseTreatmentForCurrentFarmer(Integer id) {
        DiseaseTreatment treatment = diseaseTreatmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DISEASE_TREATMENT_NOT_FOUND));
        DiseaseRecord diseaseRecord = treatment.getDiseaseRecord();
        if (diseaseRecord == null) {
            throw new AppException(ErrorCode.DISEASE_RECORD_NOT_FOUND);
        }
        Season season = resolveSeasonOfRecord(diseaseRecord);
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);
        return treatment;
    }

    private DiseaseTreatment getDiseaseTreatmentForCurrentEmployee(Integer id) {
        DiseaseTreatment treatment = diseaseTreatmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DISEASE_TREATMENT_NOT_FOUND));
        DiseaseRecord diseaseRecord = treatment.getDiseaseRecord();
        if (diseaseRecord == null) {
            throw new AppException(ErrorCode.DISEASE_RECORD_NOT_FOUND);
        }
        Season season = resolveSeasonOfRecord(diseaseRecord);
        seasonWorkspaceAccessService.requireActiveEmployeeAssignment(season);
        return treatment;
    }

    private Season getSeasonForCurrentFarmer(Integer seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_NOT_FOUND));
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);
        return season;
    }

    private Season getSeasonForCurrentEmployee(Integer seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_NOT_FOUND));
        seasonWorkspaceAccessService.requireActiveEmployeeAssignment(season);
        return season;
    }

    private Season resolveSeasonOfRecord(DiseaseRecord diseaseRecord) {
        Season season = diseaseRecord.getSeason();
        if (season == null) {
            throw new AppException(ErrorCode.SEASON_NOT_FOUND);
        }
        return season;
    }

    private void ensureSeasonOpenForDiseaseWrite(Season season, boolean forCreate) {
        if (season == null || season.getStatus() == null) {
            throw new AppException(ErrorCode.SEASON_NOT_FOUND);
        }
        if (season.getStatus() == SeasonStatus.COMPLETED
                || season.getStatus() == SeasonStatus.CANCELLED
                || season.getStatus() == SeasonStatus.ARCHIVED) {
            if (forCreate) {
                throw new AppException(ErrorCode.SEASON_CLOSED_CANNOT_ADD_DISEASE_RECORD);
            }
            throw new AppException(ErrorCode.SEASON_CLOSED_CANNOT_MODIFY_DISEASE_RECORD);
        }
    }

    private void validateDetectedAtWithinSeason(Season season, LocalDateTime detectedAt) {
        if (detectedAt == null) {
            throw new AppException(ErrorCode.KEY_INVALID);
        }
        LocalDate startDate = season.getStartDate();
        LocalDate endDate = season.getEndDate() != null ? season.getEndDate() : season.getPlannedHarvestDate();
        LocalDate targetDate = detectedAt.toLocalDate();

        if (startDate == null || targetDate.isBefore(startDate) || (endDate != null && targetDate.isAfter(endDate))) {
            throw new AppException(ErrorCode.INVALID_DISEASE_DETECTED_AT);
        }
    }

    private void validateTreatmentDate(DiseaseRecord diseaseRecord, LocalDateTime treatedAt) {
        if (treatedAt == null) {
            throw new AppException(ErrorCode.KEY_INVALID);
        }
        if (diseaseRecord.getDetectedAt() != null && treatedAt.isBefore(diseaseRecord.getDetectedAt())) {
            throw new AppException(ErrorCode.INVALID_DISEASE_TREATED_AT);
        }
    }

    private DiseaseSeverity parseSeverity(String severity) {
        try {
            return DiseaseSeverity.fromCode(severity);
        } catch (Exception ex) {
            throw new AppException(ErrorCode.INVALID_DISEASE_SEVERITY);
        }
    }

    private DiseaseStatus parseStatus(String status) {
        try {
            return DiseaseStatus.fromCode(status);
        } catch (Exception ex) {
            throw new AppException(ErrorCode.INVALID_DISEASE_STATUS);
        }
    }

    private TreatmentEffectiveness parseEffectiveness(String effectiveness) {
        try {
            return TreatmentEffectiveness.fromCode(effectiveness);
        } catch (Exception ex) {
            throw new AppException(ErrorCode.INVALID_TREATMENT_EFFECTIVENESS);
        }
    }

    private ResolvedSupplyReference resolveSupplyReference(Integer supplyItemId, Integer supplyLotId, Season season) {
        Integer resolvedSupplyItemId = supplyItemId;
        Integer resolvedSupplyLotId = supplyLotId;

        Integer farmId = seasonWorkspaceAccessService.resolveSeasonFarmId(season);
        String farmIdsCsv = String.valueOf(farmId);

        if (resolvedSupplyLotId != null) {
            ExternalServiceClient.ValidationResultDto val = externalServiceClient.validateSupplyLot(resolvedSupplyLotId, resolvedSupplyItemId, farmIdsCsv);
            if (!val.isValid()) {
                if ("SUPPLY_LOT_NOT_FOUND".equals(val.getErrorCode())) {
                    throw new AppException(ErrorCode.SUPPLY_LOT_NOT_FOUND);
                }
                if ("DISEASE_SUPPLY_ITEM_LOT_MISMATCH".equals(val.getErrorCode())) {
                    throw new AppException(ErrorCode.DISEASE_SUPPLY_ITEM_LOT_MISMATCH);
                }
                throw new AppException(ErrorCode.FORBIDDEN);
            }
            if (resolvedSupplyItemId == null) {
                resolvedSupplyItemId = val.getResolvedItemId();
            }
        }

        if (resolvedSupplyItemId != null) {
            if (resolvedSupplyLotId == null && !seasonWorkspaceAccessService.isCurrentUserSeasonOwner(season)) {
                ExternalServiceClient.ValidationResultDto val = externalServiceClient.validateSupplyItem(resolvedSupplyItemId, farmIdsCsv);
                if (!val.isValid()) {
                    if ("SUPPLY_ITEM_NOT_FOUND".equals(val.getErrorCode())) {
                        throw new AppException(ErrorCode.SUPPLY_ITEM_NOT_FOUND);
                    }
                    throw new AppException(ErrorCode.FORBIDDEN);
                }
            }
        }

        return new ResolvedSupplyReference(resolvedSupplyItemId, resolvedSupplyLotId);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void logRecordAudit(String operation, DiseaseRecord diseaseRecord) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("diseaseRecordId", diseaseRecord.getId());
        snapshot.put("seasonId", diseaseRecord.getSeason() != null ? diseaseRecord.getSeason().getId() : null);
        snapshot.put("status", diseaseRecord.getStatus() != null ? diseaseRecord.getStatus().name() : null);
        snapshot.put("severity", diseaseRecord.getSeverity() != null ? diseaseRecord.getSeverity().name() : null);
        snapshot.put("detectedAt", diseaseRecord.getDetectedAt());
        snapshot.put("incidentId", diseaseRecord.getIncidentId());

        String actor = resolveAuditActor();
        auditLogService.logModuleOperation(
                "DISEASE",
                "DISEASE_RECORD",
                diseaseRecord.getId(),
                operation,
                actor,
                snapshot,
                null,
                null);
    }

    private void logTreatmentAudit(String operation, DiseaseTreatment treatment) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("diseaseTreatmentId", treatment.getId());
        snapshot.put("diseaseRecordId", treatment.getDiseaseRecord() != null ? treatment.getDiseaseRecord().getId() : null);
        snapshot.put("treatedAt", treatment.getTreatedAt());
        snapshot.put("supplyItemId", treatment.getSupplyItemId());
        snapshot.put("supplyLotId", treatment.getSupplyLotId());
        snapshot.put("expenseId", treatment.getExpenseId());
        snapshot.put("effectiveness", treatment.getEffectiveness() != null ? treatment.getEffectiveness().name() : null);

        String actor = resolveAuditActor();
        auditLogService.logModuleOperation(
                "DISEASE",
                "DISEASE_TREATMENT",
                treatment.getId(),
                operation,
                actor,
                snapshot,
                null,
                null);
    }

    private String resolveAuditActor() {
        try {
            ExternalServiceClient.UserInternalDto actor = seasonWorkspaceAccessService.getCurrentUser();
            if (actor != null && StringUtils.hasText(actor.getUsername())) {
                return actor.getUsername();
            }
        } catch (Exception ignored) {
        }
        return "system";
    }

    private record ResolvedSupplyReference(Integer supplyItemId, Integer supplyLotId) {
    }

    private GeminiDiseaseSuggestionPayload parseAiSuggestionJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return new GeminiDiseaseSuggestionPayload();
        }
        String cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```json\\s*", "").replaceAll("^```\\s*", "").replaceAll("```\\s*$", "");
        }
        try {
            return objectMapper.readValue(cleaned, GeminiDiseaseSuggestionPayload.class);
        } catch (Exception e) {
            log.warn("Failed to parse AI disease-suggestion JSON, falling back to raw text: {}", e.getMessage());
            GeminiDiseaseSuggestionPayload fallback = new GeminiDiseaseSuggestionPayload();
            fallback.setUsageInstructions(raw);
            fallback.setSummary("Không thể phân tích cấu trúc phản hồi AI — hiển thị nguyên văn.");
            return fallback;
        }
    }

    @lombok.Data
    private static class GeminiDiseaseSuggestionPayload {
        private Boolean matchedFromInventory;
        private String matchedSupplyName;
        private String recommendedProductName;
        private String recommendedActiveIngredient;
        private String usageInstructions;
        private String safetyNotes;
        private String summary;
    }
}
