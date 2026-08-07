package org.example.season.controller;

import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.season.dto.common.ApiResponse;
import org.example.season.dto.common.PageResponse;
import org.example.season.dto.request.CreateDiseaseRecordRequest;
import org.example.season.dto.request.CreateDiseaseTreatmentRequest;
import org.example.season.dto.request.UpdateDiseaseRecordRequest;
import org.example.season.dto.request.UpdateDiseaseTreatmentRequest;
import org.example.season.dto.response.DiseaseRecordDetailResponse;
import org.example.season.dto.response.DiseaseRecordResponse;
import org.example.season.dto.response.DiseaseTreatmentResponse;
import org.example.season.service.DiseaseRecordService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('FARMER')")
public class DiseaseRecordController {

    DiseaseRecordService diseaseRecordService;

    @GetMapping("/seasons/{seasonId}/disease-records")
    public ApiResponse<PageResponse<DiseaseRecordResponse>> listDiseaseRecordsBySeason(
            @PathVariable Integer seasonId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "severity", required = false) String severity,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "fromDetectedAt", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDetectedAt,
            @RequestParam(value = "toDetectedAt", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDetectedAt,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(diseaseRecordService.listDiseaseRecordsBySeason(
                seasonId,
                status,
                severity,
                q,
                fromDetectedAt,
                toDetectedAt,
                page,
                size));
    }

    @PostMapping("/seasons/{seasonId}/disease-records")
    public ApiResponse<DiseaseRecordResponse> createDiseaseRecord(
            @PathVariable Integer seasonId,
            @Valid @RequestBody CreateDiseaseRecordRequest request) {
        return ApiResponse.success(diseaseRecordService.createDiseaseRecord(seasonId, request));
    }

    @GetMapping("/disease-records/{id}")
    public ApiResponse<DiseaseRecordDetailResponse> getDiseaseRecordDetail(@PathVariable Integer id) {
        return ApiResponse.success(diseaseRecordService.getDiseaseRecordDetail(id));
    }

    @PutMapping("/disease-records/{id}")
    public ApiResponse<DiseaseRecordResponse> updateDiseaseRecord(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateDiseaseRecordRequest request) {
        return ApiResponse.success(diseaseRecordService.updateDiseaseRecord(id, request));
    }

    @DeleteMapping("/disease-records/{id}")
    public ApiResponse<Void> deleteDiseaseRecord(@PathVariable Integer id) {
        diseaseRecordService.deleteDiseaseRecord(id);
        return ApiResponse.success(null);
    }

    @GetMapping("/disease-records/{id}/treatments")
    public ApiResponse<PageResponse<DiseaseTreatmentResponse>> listTreatments(
            @PathVariable Integer id,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(diseaseRecordService.listTreatments(id, page, size));
    }

    @PostMapping("/disease-records/{id}/treatments")
    public ApiResponse<DiseaseTreatmentResponse> createTreatment(
            @PathVariable Integer id,
            @Valid @RequestBody CreateDiseaseTreatmentRequest request) {
        return ApiResponse.success(diseaseRecordService.createTreatment(id, request));
    }

    @PutMapping("/disease-treatments/{id}")
    public ApiResponse<DiseaseTreatmentResponse> updateTreatment(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateDiseaseTreatmentRequest request) {
        return ApiResponse.success(diseaseRecordService.updateTreatment(id, request));
    }

    @DeleteMapping("/disease-treatments/{id}")
    public ApiResponse<Void> deleteTreatment(@PathVariable Integer id) {
        diseaseRecordService.deleteTreatment(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/disease-records/{id}/ai-suggestion")
    public ApiResponse<org.example.season.dto.response.DiseaseSuggestionResponse> generateAiSuggestion(
            @PathVariable Integer id,
            @RequestBody org.example.season.dto.request.DiseaseSuggestionRequest request) {
        return ApiResponse.success(diseaseRecordService.generateAiSuggestion(id, request));
    }
}
