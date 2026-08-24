package org.example.farm.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.farm.config.CurrentUserService;
import org.example.farm.dto.common.ApiResponse;
import org.example.farm.dto.request.*;
import org.example.farm.dto.response.*;
import org.example.farm.service.CertificationAuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints cho vòng đời audit chứng nhận (§5.8 BRD).
 * Tuân theo convention /api/v1/farms/{farmId}/certification/...
 */
@RestController
@RequiredArgsConstructor
public class CertificationAuditController {

    private final CertificationAuditService auditService;
    private final CurrentUserService currentUserService;

    // ==========================================
    // Audit endpoints — under /api/v1/farms/{farmId}/certification/
    // ==========================================

    /** Auditor/Admin lên lịch đánh giá */
    @PostMapping("/api/v1/farms/{farmId}/certification/audits")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<ApiResponse<CertificationAuditResponse>> scheduleAudit(
            @PathVariable Integer farmId,
            @RequestBody @Valid CreateAuditRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auditService.scheduleAudit(farmId, request)));
    }

    /** Lấy danh sách đợt audit của farm */
    @GetMapping("/api/v1/farms/{farmId}/certification/audits")
    @PreAuthorize("hasAnyRole('FARMER', 'ADMIN', 'AUDITOR')")
    public ResponseEntity<ApiResponse<List<CertificationAuditResponse>>> getAudits(
            @PathVariable Integer farmId) {
        return ResponseEntity.ok(ApiResponse.success(auditService.getAudits(farmId)));
    }

    /** Admin: lấy danh sách tất cả đợt audit xuyên farm */
    @GetMapping("/api/v1/admin/certification-audits")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<CertificationAuditResponse>>> getAllAudits() {
        return ResponseEntity.ok(ApiResponse.success(auditService.getAllAuditsForAdmin()));
    }

    /** Bắt đầu audit */
    @PutMapping("/api/v1/certification-audits/{auditId}/start")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<ApiResponse<CertificationAuditResponse>> startAudit(
            @PathVariable Long auditId) {
        return ResponseEntity.ok(ApiResponse.success(auditService.startAudit(auditId)));
    }

    /** Kết luận audit (PASSED/FAILED) */
    @PutMapping("/api/v1/certification-audits/{auditId}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<ApiResponse<CertificationAuditResponse>> completeAudit(
            @PathVariable Long auditId,
            @RequestBody @Valid CompleteAuditRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auditService.completeAudit(auditId, request)));
    }

    // ==========================================
    // Nonconformity endpoints
    // ==========================================

    /** Auditor ghi nhận lỗi không phù hợp */
    @PostMapping("/api/v1/certification-audits/{auditId}/nonconformities")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<ApiResponse<NonconformityResponse>> recordNonconformity(
            @PathVariable Long auditId,
            @RequestBody @Valid CreateNonconformityRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auditService.recordNonconformity(auditId, request)));
    }

    /** Farmer xem danh sách lỗi cần khắc phục */
    @GetMapping("/api/v1/farms/{farmId}/certification/nonconformities")
    @PreAuthorize("hasAnyRole('FARMER', 'ADMIN', 'AUDITOR')")
    public ResponseEntity<ApiResponse<List<NonconformityResponse>>> getNonconformities(
            @PathVariable Integer farmId) {
        return ResponseEntity.ok(ApiResponse.success(auditService.getNonconformities(farmId)));
    }

    // ==========================================
    // Corrective Action endpoints
    // ==========================================

    /** Farmer tạo kế hoạch khắc phục (nháp) */
    @PostMapping("/api/v1/certification-nonconformities/{nonconformityId}/corrective-actions")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<ApiResponse<CorrectiveActionResponse>> createCorrectiveAction(
            @PathVariable Long nonconformityId,
            @RequestBody @Valid CreateCorrectiveActionRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                auditService.createCorrectiveAction(nonconformityId, request, userId)));
    }

    /** Farmer sửa kế hoạch trước khi nộp */
    @PutMapping("/api/v1/certification-corrective-actions/{actionId}")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<ApiResponse<CorrectiveActionResponse>> updateCorrectiveAction(
            @PathVariable Long actionId,
            @RequestBody @Valid CreateCorrectiveActionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auditService.updateCorrectiveAction(actionId, request)));
    }

    /** Farmer nộp chính thức */
    @PostMapping("/api/v1/certification-corrective-actions/{actionId}/submit")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<ApiResponse<CorrectiveActionResponse>> submitCorrectiveAction(
            @PathVariable Long actionId) {
        Long userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(auditService.submitCorrectiveAction(actionId, userId)));
    }

    /** Auditor xác nhận đạt/không đạt */
    @PutMapping("/api/v1/certification-corrective-actions/{actionId}/review")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<ApiResponse<CorrectiveActionResponse>> reviewCorrectiveAction(
            @PathVariable Long actionId,
            @RequestBody @Valid ReviewCorrectiveActionRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                auditService.reviewCorrectiveAction(actionId, request, userId)));
    }

    // ==========================================
    // Certificate Issuance
    // ==========================================

    /** Auditor cấp giấy chứng nhận */
    @PostMapping("/api/v1/farms/{farmId}/certification/issue")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<ApiResponse<String>> issueCertificate(
            @PathVariable Integer farmId,
            @RequestBody @Valid IssueCertificateRequest request) {
        auditService.issueCertificate(farmId, request);
        return ResponseEntity.ok(ApiResponse.success("Giấy chứng nhận đã được cấp thành công"));
    }

    // ==========================================
    // Admin Document Verification
    // ==========================================

    /** Admin duyệt tài liệu (đặc biệt giấy chứng nhận → auto PUBLISHED) */
    @PatchMapping("/api/v1/admin/farms/{farmId}/documents/{documentId}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> verifyDocument(
            @PathVariable Integer farmId,
            @PathVariable Integer documentId,
            @RequestBody @Valid VerifyDocumentRequest request) {
        Long adminUserId = currentUserService.getCurrentUserId();
        auditService.verifyDocument(farmId, documentId, request, adminUserId);
        return ResponseEntity.ok(ApiResponse.success("Tài liệu đã được xác minh"));
    }
}

