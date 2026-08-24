package org.example.farm.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.farm.dto.request.*;
import org.example.farm.dto.response.*;
import org.example.farm.entity.*;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service xử lý toàn bộ vòng đời audit chứng nhận:
 * schedule → start → complete → nonconformity → corrective action → issue → publish.
 * Tuân thủ state machine §5.4 trong BRD.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class CertificationAuditService {

    private final CertificationRecordRepository recordRepository;
    private final CertificationAuditRepository auditRepository;
    private final CertificationNonconformityRepository nonconformityRepository;
    private final CertificationCorrectiveActionRepository correctiveActionRepository;
    private final FarmDocumentRepository farmDocumentRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final CertificationService certificationService;
    private final FarmRepository farmRepository;
    private final CertificationStandardRepository standardRepository;

    // === VALID TRANSITIONS (state machine guard) ===
    private static final Map<String, Set<String>> VALID_TRANSITIONS = Map.ofEntries(
        Map.entry("APPLIED", Set.of("AUDIT_SCHEDULED")),
        Map.entry("AUDIT_SCHEDULED", Set.of("AUDIT_IN_PROGRESS")),
        Map.entry("AUDIT_IN_PROGRESS", Set.of("AUDIT_PASSED", "NONCONFORMITY_FOUND")),
        Map.entry("NONCONFORMITY_FOUND", Set.of("CORRECTIVE_ACTION_SUBMITTED")),
        Map.entry("CORRECTIVE_ACTION_SUBMITTED", Set.of("AUDIT_PASSED", "NONCONFORMITY_FOUND", "REJECTED")),
        Map.entry("AUDIT_PASSED", Set.of("CERTIFIED")),
        Map.entry("CERTIFIED", Set.of("PUBLISHED", "PERIODIC_REVIEW_DUE", "EXPIRED", "REVOKED")),
        Map.entry("PUBLISHED", Set.of("PERIODIC_REVIEW_DUE", "EXPIRED", "REVOKED")),
        Map.entry("PERIODIC_REVIEW_DUE", Set.of("AUDIT_SCHEDULED", "EXPIRED")),
        Map.entry("REJECTED", Set.of("IN_PROGRESS"))
    );

    // ==========================================
    // D2: Schedule Audit
    // ==========================================
    public CertificationAuditResponse scheduleAudit(Integer farmId, CreateAuditRequest req) {
        CertificationRecord record = findRecordByFarmId(farmId);
        validateTransition(record.getStatus(), "AUDIT_SCHEDULED");

        CertificationAudit audit = CertificationAudit.builder()
                .recordId(record.getId())
                .auditType(req.getAuditType().toUpperCase())
                .scheduledDate(req.getScheduledDate())
                .auditorUserId(req.getAuditorUserId())
                .auditorOrgName(req.getAuditorOrgName())
                .status("SCHEDULED")
                .build();
        audit = auditRepository.save(audit);

        record.setStatus("AUDIT_SCHEDULED");
        recordRepository.save(record);

        publishEvent("farm.certification.audit_scheduled", record.getId().toString(),
                Map.of("farmId", farmId, "auditId", audit.getId(), "scheduledDate", req.getScheduledDate().toString()));

        return toAuditResponse(audit);
    }

    // ==========================================
    // D2: Start Audit
    // ==========================================
    public CertificationAuditResponse startAudit(Long auditId) {
        CertificationAudit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new AppException(ErrorCode.AUDIT_NOT_FOUND));

        if (!"SCHEDULED".equals(audit.getStatus())) {
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
        }

        CertificationRecord record = recordRepository.findById(audit.getRecordId())
                .orElseThrow(() -> new AppException(ErrorCode.CERTIFICATION_NOT_FOUND));
        validateTransition(record.getStatus(), "AUDIT_IN_PROGRESS");

        audit.setStatus("IN_PROGRESS");
        audit.setConductedAt(LocalDateTime.now());
        auditRepository.save(audit);

        record.setStatus("AUDIT_IN_PROGRESS");
        recordRepository.save(record);

        return toAuditResponse(audit);
    }

    // ==========================================
    // D2: Complete Audit (PASSED / FAILED)
    // ==========================================
    public CertificationAuditResponse completeAudit(Long auditId, CompleteAuditRequest req) {
        CertificationAudit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new AppException(ErrorCode.AUDIT_NOT_FOUND));

        if (!"IN_PROGRESS".equals(audit.getStatus())) {
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
        }

        CertificationRecord record = recordRepository.findById(audit.getRecordId())
                .orElseThrow(() -> new AppException(ErrorCode.CERTIFICATION_NOT_FOUND));

        if (req.getInterviewNotes() != null) audit.setInterviewNotes(req.getInterviewNotes());
        if (req.getSampleCollectionNotes() != null) audit.setSampleCollectionNotes(req.getSampleCollectionNotes());

        String result = req.getResult().toUpperCase();
        if ("PASSED".equals(result)) {
            audit.setStatus("PASSED");
            record.setStatus("AUDIT_PASSED");
        } else {
            // Check if there are nonconformities recorded
            List<CertificationNonconformity> ncs = nonconformityRepository.findByAuditId(auditId);
            if (ncs.isEmpty()) {
                throw new AppException(ErrorCode.BAD_REQUEST);
                // Cannot fail audit without recording nonconformities
            }
            audit.setStatus("FAILED");
            record.setStatus("NONCONFORMITY_FOUND");
        }

        auditRepository.save(audit);
        recordRepository.save(record);
        return toAuditResponse(audit);
    }

    // ==========================================
    // D2: Record Nonconformity
    // ==========================================
    public NonconformityResponse recordNonconformity(Long auditId, CreateNonconformityRequest req) {
        CertificationAudit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new AppException(ErrorCode.AUDIT_NOT_FOUND));

        if (!"IN_PROGRESS".equals(audit.getStatus())) {
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
        }

        CertificationNonconformity nc = CertificationNonconformity.builder()
                .auditId(auditId)
                .checklistItemId(req.getChecklistItemId())
                .severity(req.getSeverity().toUpperCase())
                .description(req.getDescription())
                .status("OPEN")
                .build();
        nc = nonconformityRepository.save(nc);

        CertificationRecord record = recordRepository.findById(audit.getRecordId())
                .orElseThrow(() -> new AppException(ErrorCode.CERTIFICATION_NOT_FOUND));

        publishEvent("farm.certification.nonconformity_recorded", record.getId().toString(),
                Map.of("farmId", record.getFarmId(), "auditId", auditId, "nonconformityId", nc.getId(),
                        "severity", nc.getSeverity()));

        return toNonconformityResponse(nc);
    }

    // ==========================================
    // D3: Get Nonconformities for a farm
    // ==========================================
    @Transactional(readOnly = true)
    public List<NonconformityResponse> getNonconformities(Integer farmId) {
        CertificationRecord record = findRecordByFarmId(farmId);
        List<CertificationAudit> audits = auditRepository.findByRecordId(record.getId());

        List<Long> auditIds = audits.stream().map(CertificationAudit::getId).toList();
        if (auditIds.isEmpty()) return List.of();

        List<CertificationNonconformity> ncs = nonconformityRepository.findByAuditIdIn(auditIds);
        return ncs.stream().map(nc -> {
            NonconformityResponse resp = toNonconformityResponse(nc);
            List<CertificationCorrectiveAction> cas = correctiveActionRepository.findByNonconformityId(nc.getId());
            resp.setCorrectiveActions(cas.stream().map(this::toCorrectiveActionResponse).toList());
            return resp;
        }).toList();
    }

    // ==========================================
    // D3: Create Corrective Action (draft)
    // ==========================================
    public CorrectiveActionResponse createCorrectiveAction(Long nonconformityId, CreateCorrectiveActionRequest req, Long userId) {
        CertificationNonconformity nc = nonconformityRepository.findById(nonconformityId)
                .orElseThrow(() -> new AppException(ErrorCode.NONCONFORMITY_NOT_FOUND));

        if (!"OPEN".equals(nc.getStatus()) && !"REJECTED".equals(nc.getStatus())) {
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
        }

        CertificationCorrectiveAction ca = CertificationCorrectiveAction.builder()
                .nonconformityId(nonconformityId)
                .planDescription(req.getPlanDescription())
                .evidenceUrls(serializeUrls(req.getEvidenceUrls()))
                .appliesFromSeasonId(req.getAppliesFromSeasonId())
                .submittedByUserId(userId)
                .build();
        ca = correctiveActionRepository.save(ca);

        return toCorrectiveActionResponse(ca);
    }

    // ==========================================
    // D3: Update Corrective Action (edit before submit)
    // ==========================================
    public CorrectiveActionResponse updateCorrectiveAction(Long actionId, CreateCorrectiveActionRequest req) {
        CertificationCorrectiveAction ca = correctiveActionRepository.findById(actionId)
                .orElseThrow(() -> new AppException(ErrorCode.CORRECTIVE_ACTION_NOT_FOUND));

        if (ca.getSubmittedAt() != null) {
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
            // Cannot edit after submitted
        }

        if (req.getPlanDescription() != null) ca.setPlanDescription(req.getPlanDescription());
        if (req.getEvidenceUrls() != null) ca.setEvidenceUrls(serializeUrls(req.getEvidenceUrls()));
        if (req.getAppliesFromSeasonId() != null) ca.setAppliesFromSeasonId(req.getAppliesFromSeasonId());

        ca = correctiveActionRepository.save(ca);
        return toCorrectiveActionResponse(ca);
    }

    // ==========================================
    // D3: Submit Corrective Action
    // ==========================================
    public CorrectiveActionResponse submitCorrectiveAction(Long actionId, Long userId) {
        CertificationCorrectiveAction ca = correctiveActionRepository.findById(actionId)
                .orElseThrow(() -> new AppException(ErrorCode.CORRECTIVE_ACTION_NOT_FOUND));

        if (ca.getSubmittedAt() != null) {
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
        }

        ca.setSubmittedAt(LocalDateTime.now());
        ca.setSubmittedByUserId(userId);
        correctiveActionRepository.save(ca);

        // Update nonconformity status
        CertificationNonconformity nc = nonconformityRepository.findById(ca.getNonconformityId())
                .orElseThrow(() -> new AppException(ErrorCode.NONCONFORMITY_NOT_FOUND));
        nc.setStatus("CORRECTIVE_ACTION_SUBMITTED");
        nonconformityRepository.save(nc);

        // Check if ALL nonconformities of the audit have corrective actions submitted
        CertificationAudit audit = auditRepository.findById(nc.getAuditId())
                .orElseThrow(() -> new AppException(ErrorCode.AUDIT_NOT_FOUND));
        List<CertificationNonconformity> allNcs = nonconformityRepository.findByAuditId(audit.getId());
        boolean allSubmitted = allNcs.stream().allMatch(n -> "CORRECTIVE_ACTION_SUBMITTED".equals(n.getStatus()) || "RESOLVED".equals(n.getStatus()));

        if (allSubmitted) {
            CertificationRecord record = recordRepository.findById(audit.getRecordId())
                    .orElseThrow(() -> new AppException(ErrorCode.CERTIFICATION_NOT_FOUND));
            record.setStatus("CORRECTIVE_ACTION_SUBMITTED");
            recordRepository.save(record);

            publishEvent("farm.certification.corrective_action_submitted", record.getId().toString(),
                    Map.of("farmId", record.getFarmId(), "auditId", audit.getId()));
        }

        return toCorrectiveActionResponse(ca);
    }

    // ==========================================
    // D3: Review Corrective Action (Auditor)
    // ==========================================
    public CorrectiveActionResponse reviewCorrectiveAction(Long actionId, ReviewCorrectiveActionRequest req, Long reviewerUserId) {
        CertificationCorrectiveAction ca = correctiveActionRepository.findById(actionId)
                .orElseThrow(() -> new AppException(ErrorCode.CORRECTIVE_ACTION_NOT_FOUND));

        if (ca.getSubmittedAt() == null) {
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
        }

        String result = req.getResult().toUpperCase();
        ca.setReviewResult(result);
        ca.setReviewNote(req.getReviewNote());
        ca.setReviewedByUserId(reviewerUserId);
        ca.setReviewedAt(LocalDateTime.now());
        correctiveActionRepository.save(ca);

        CertificationNonconformity nc = nonconformityRepository.findById(ca.getNonconformityId())
                .orElseThrow(() -> new AppException(ErrorCode.NONCONFORMITY_NOT_FOUND));

        if ("ACCEPTED".equals(result)) {
            nc.setStatus("RESOLVED");
        } else {
            nc.setStatus("OPEN"); // Rejected → farmer must redo
        }
        nonconformityRepository.save(nc);

        // Check if ALL nonconformities of audit are RESOLVED
        CertificationAudit audit = auditRepository.findById(nc.getAuditId())
                .orElseThrow(() -> new AppException(ErrorCode.AUDIT_NOT_FOUND));
        List<CertificationNonconformity> allNcs = nonconformityRepository.findByAuditId(audit.getId());
        boolean allResolved = allNcs.stream().allMatch(n -> "RESOLVED".equals(n.getStatus()));
        boolean anyOpen = allNcs.stream().anyMatch(n -> "OPEN".equals(n.getStatus()));

        CertificationRecord record = recordRepository.findById(audit.getRecordId())
                .orElseThrow(() -> new AppException(ErrorCode.CERTIFICATION_NOT_FOUND));

        if (allResolved) {
            record.setStatus("AUDIT_PASSED");
        } else if (anyOpen) {
            record.setStatus("NONCONFORMITY_FOUND");
        }
        recordRepository.save(record);

        return toCorrectiveActionResponse(ca);
    }

    // ==========================================
    // D4: Issue Certificate
    // ==========================================
    public void issueCertificate(Integer farmId, IssueCertificateRequest req) {
        CertificationRecord record = findRecordByFarmId(farmId);
        validateTransition(record.getStatus(), "CERTIFIED");
        certificationService.requireVerifiedEvidence(farmId);

        // BR-D-01: Check no CRITICAL nonconformity is OPEN
        List<CertificationAudit> audits = auditRepository.findByRecordId(record.getId());
        for (CertificationAudit audit : audits) {
            List<CertificationNonconformity> ncs = nonconformityRepository.findByAuditId(audit.getId());
            boolean hasCriticalOpen = ncs.stream()
                    .anyMatch(nc -> "CRITICAL".equals(nc.getSeverity()) && "OPEN".equals(nc.getStatus()));
            if (hasCriticalOpen) {
                throw new AppException(ErrorCode.CRITICAL_NONCONFORMITY_OPEN);
            }
        }

        record.setStatus("CERTIFIED");
        record.setCertifiedAt(LocalDateTime.now());
        record.setExpiryDate(req.getExpiryDate());
        record.setCertificateNumber(req.getCertificateNumber());
        record.setCertificateDocumentId(req.getCertificateDocumentId());
        // Default periodic review 6 months after certification
        record.setNextPeriodicReviewDate(req.getIssuedDate().plusMonths(6));
        recordRepository.save(record);

        publishEvent("farm.certification.certified", record.getId().toString(),
                Map.of("farmId", farmId, "certificateNumber", req.getCertificateNumber(),
                        "expiryDate", req.getExpiryDate().toString()));
    }

    // ==========================================
    // D5: Admin Verify Document → auto PUBLISHED for CERTIFICATE
    // ==========================================
    public void verifyDocument(Integer farmId, Integer documentId, VerifyDocumentRequest req, Long adminUserId) {
        FarmDocument doc = farmDocumentRepository.findById(documentId)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));

        if (!doc.getFarmId().equals(farmId)) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        if ("VERIFIED".equals(req.getStatus().toUpperCase())
                && "CERTIFICATE".equals(doc.getDocumentType())) {
            certificationService.requireVerifiedEvidence(farmId);
        }

        doc.setVerificationStatus(req.getStatus().toUpperCase());
        doc.setVerifiedBy(adminUserId);
        doc.setVerifiedAt(LocalDateTime.now());
        farmDocumentRepository.save(doc);

        publishEvent("farm.document.verified", doc.getId().toString(),
                Map.of("farmId", farmId, "documentId", documentId, "status", req.getStatus()));

        // BR-D-02: If this is CERTIFICATE document and VERIFIED → auto PUBLISHED
        if ("VERIFIED".equals(req.getStatus().toUpperCase()) && "CERTIFICATE".equals(doc.getDocumentType())) {
            // Find certification record linked to this document
            List<CertificationRecord> records = recordRepository.findByFarmId(farmId);
            for (CertificationRecord record : records) {
                if (record.getCertificateDocumentId() != null && record.getCertificateDocumentId().equals(documentId)
                        && "CERTIFIED".equals(record.getStatus())) {
                    record.setStatus("PUBLISHED");
                    record.setPublishedAt(LocalDateTime.now());
                    record.setPublishedByUserId(adminUserId);
                    recordRepository.save(record);
                    log.info("Auto-published certification record {} for farm {} after document verified", record.getId(), farmId);
                }
            }
        }
    }

    // ==========================================
    // D6: Get Audits for a farm
    // ==========================================
    @Transactional(readOnly = true)
    public List<CertificationAuditResponse> getAudits(Integer farmId) {
        CertificationRecord record = findRecordByFarmId(farmId);
        List<CertificationAudit> audits = auditRepository.findByRecordIdOrderByCreatedAtDesc(record.getId());
        return audits.stream().map(this::toAuditResponse).toList();
    }

    /**
     * Admin: list all audits across all farms.
     */
    @Transactional(readOnly = true)
    public List<CertificationAuditResponse> getAllAuditsForAdmin() {
        List<CertificationAudit> audits = auditRepository.findAll();
        return audits.stream().map(audit -> {
            CertificationAuditResponse resp = toAuditResponse(audit);
            recordRepository.findById(audit.getRecordId()).ifPresent(record -> {
                resp.setFarmId(record.getFarmId());
                resp.setComplianceScore(record.getComplianceScore());
                resp.setRecordStatus(record.getStatus());
                farmRepository.findById(record.getFarmId())
                        .ifPresent(farm -> resp.setFarmName(farm.getName()));
                standardRepository.findById(record.getStandardId())
                        .ifPresent(standard -> resp.setStandardCode(standard.getCode()));
            });
            resp.setNonconformities(nonconformityRepository.findByAuditId(audit.getId())
                    .stream().map(this::toNonconformityResponse).toList());
            return resp;
        }).toList();
    }

    // ==========================================
    // Helper: find record by farmId (latest)
    // ==========================================
    private CertificationRecord findRecordByFarmId(Integer farmId) {
        List<CertificationRecord> records = recordRepository.findByFarmId(farmId);
        if (records.isEmpty()) {
            throw new AppException(ErrorCode.CERTIFICATION_NOT_FOUND);
        }
        // Return the first (most relevant) record
        return records.get(0);
    }

    // ==========================================
    // Helper: validate state machine transition
    // ==========================================
    private void validateTransition(String currentStatus, String targetStatus) {
        Set<String> allowed = VALID_TRANSITIONS.get(currentStatus);
        if (allowed == null || !allowed.contains(targetStatus)) {
            log.warn("Invalid certification transition: {} → {}", currentStatus, targetStatus);
            throw new AppException(ErrorCode.CERTIFICATION_INVALID_TRANSITION);
        }
    }

    // ==========================================
    // Helper: publish outbox event
    // ==========================================
    private void publishEvent(String eventType, String aggregateId, Map<String, Object> data) {
        try {
            OutboxEvent event = OutboxEvent.builder()
                    .aggregateType("CertificationRecord")
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .payload(objectMapper.writeValueAsString(data))
                    .build();
            outboxEventRepository.save(event);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize outbox event payload", e);
        }
    }

    // ==========================================
    // Mappers: Entity → Response DTO
    // ==========================================
    private CertificationAuditResponse toAuditResponse(CertificationAudit audit) {
        return CertificationAuditResponse.builder()
                .id(audit.getId())
                .recordId(audit.getRecordId())
                .auditType(audit.getAuditType())
                .scheduledDate(audit.getScheduledDate())
                .auditorUserId(audit.getAuditorUserId())
                .auditorOrgName(audit.getAuditorOrgName())
                .status(audit.getStatus())
                .interviewNotes(audit.getInterviewNotes())
                .sampleCollectionNotes(audit.getSampleCollectionNotes())
                .conductedAt(audit.getConductedAt())
                .createdAt(audit.getCreatedAt())
                .build();
    }

    private NonconformityResponse toNonconformityResponse(CertificationNonconformity nc) {
        return NonconformityResponse.builder()
                .id(nc.getId())
                .auditId(nc.getAuditId())
                .checklistItemId(nc.getChecklistItemId())
                .severity(nc.getSeverity())
                .description(nc.getDescription())
                .status(nc.getStatus())
                .createdAt(nc.getCreatedAt())
                .build();
    }

    private CorrectiveActionResponse toCorrectiveActionResponse(CertificationCorrectiveAction ca) {
        return CorrectiveActionResponse.builder()
                .id(ca.getId())
                .nonconformityId(ca.getNonconformityId())
                .planDescription(ca.getPlanDescription())
                .evidenceUrls(deserializeUrls(ca.getEvidenceUrls()))
                .appliesFromSeasonId(ca.getAppliesFromSeasonId())
                .submittedByUserId(ca.getSubmittedByUserId())
                .submittedAt(ca.getSubmittedAt())
                .reviewedByUserId(ca.getReviewedByUserId())
                .reviewResult(ca.getReviewResult())
                .reviewNote(ca.getReviewNote())
                .reviewedAt(ca.getReviewedAt())
                .createdAt(ca.getCreatedAt())
                .build();
    }

    private String serializeUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(urls);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private List<String> deserializeUrls(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }
}
