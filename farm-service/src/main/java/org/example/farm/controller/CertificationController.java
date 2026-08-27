package org.example.farm.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.farm.dto.common.ApiResponse;
import org.example.farm.dto.request.UpdateCertificationItemRequest;
import org.example.farm.dto.request.UpdateCertificationScopesRequest;
import org.example.farm.dto.response.CertificationDetailsResponse;
import org.example.farm.dto.response.CertificationScopeResponse;
import org.example.farm.service.CertificationService;
import org.example.farm.config.CurrentUserService;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.FarmRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/farms/{farmId}/certification")
@RequiredArgsConstructor
@PreAuthorize("hasRole('FARMER')")
public class CertificationController {

    private final CertificationService certificationService;
    private final CurrentUserService currentUserService;
    private final FarmRepository farmRepository;

    private void requireFarmOwner(Integer farmId) {
        Long currentUserId = currentUserService.getCurrentUserId();
        boolean owned = farmRepository.findById(farmId)
                .map(farm -> currentUserId.equals(farm.getUserId()))
                .orElse(false);
        if (!owned) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CertificationDetailsResponse>> getCertificationDetails(@PathVariable Integer farmId) {
        requireFarmOwner(farmId);
        CertificationDetailsResponse details = certificationService.getCertificationDetails(farmId);
        return ResponseEntity.ok(ApiResponse.success(details));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<String>> updateItemStatus(
            @PathVariable Integer farmId,
            @PathVariable Integer itemId,
            @RequestBody @Valid UpdateCertificationItemRequest request) {
        requireFarmOwner(farmId);
        certificationService.updateItemStatus(farmId, itemId, request);
        return ResponseEntity.ok(ApiResponse.success("Item status updated successfully"));
    }

    @PutMapping("/scope")
    public ResponseEntity<ApiResponse<List<CertificationScopeResponse>>> updateScope(
            @PathVariable Integer farmId,
            @RequestBody @Valid UpdateCertificationScopesRequest request) {
        requireFarmOwner(farmId);
        try {
            return ResponseEntity.ok(ApiResponse.success(certificationService.updateScopes(farmId, request)));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(ApiResponse.error(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "ERR_BAD_REQUEST",
                    exception.getMessage()));
        }
    }

    @PostMapping("/apply")
    public ResponseEntity<ApiResponse<String>> applyCertification(@PathVariable Integer farmId) {
        requireFarmOwner(farmId);
        try {
            certificationService.apply(farmId);
            return ResponseEntity.ok(ApiResponse.success("Đã nộp đơn xin chứng nhận VietGAP thành công"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(org.springframework.http.HttpStatus.BAD_REQUEST, "ERR_BAD_REQUEST", e.getMessage()));
        }
    }

    @PostMapping("/export-dossier")
    public ResponseEntity<ApiResponse<org.example.farm.dto.response.FarmDocumentResponse>> exportDossier(
            @PathVariable Integer farmId,
            @RequestBody org.example.farm.dto.request.ExportDossierRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            org.springframework.beans.factory.ObjectProvider<org.example.farm.client.SeasonProductionDiaryClient> diaryClientProvider,
            org.springframework.beans.factory.ObjectProvider<org.example.farm.service.FarmDocumentService> documentServiceProvider,
            org.springframework.beans.factory.ObjectProvider<org.example.farm.config.CurrentUserService> currentUserServiceProvider) {

        requireFarmOwner(farmId);
        Long resolvedUserId = userId != null ? userId : currentUserServiceProvider.getObject().getCurrentUserId();
        org.example.farm.dto.response.FarmDocumentResponse res = certificationService.exportDossier(
                farmId, request, resolvedUserId, diaryClientProvider.getObject(), documentServiceProvider.getObject()
        );
        return ResponseEntity.ok(ApiResponse.success(res));
    }
}
