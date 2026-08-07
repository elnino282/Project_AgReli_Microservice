package org.example.season.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.season.dto.common.ApiResponse;
import org.example.season.dto.common.PageResponse;
import org.example.season.dto.request.EmployeeTaskProgressRequest;
import org.example.season.dto.response.MySeasonResponse;
import org.example.season.dto.response.PayrollRecordResponse;
import org.example.season.dto.response.TaskProgressLogResponse;
import org.example.season.dto.response.TaskResponse;
import org.example.season.service.LaborManagementService;
import org.example.season.service.TaskAssignmentService;
import org.example.season.service.FieldLogService;
import org.example.season.service.DiseaseRecordService;
import org.example.season.dto.response.FieldLogResponse;
import org.example.season.dto.response.DiseaseRecordResponse;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/employee")
@RequiredArgsConstructor
@PreAuthorize("hasRole('EMPLOYEE')")
public class EmployeePortalController {

    private final TaskAssignmentService taskAssignmentService;
    private final LaborManagementService laborManagementService;
    private final FieldLogService fieldLogService;
    private final DiseaseRecordService diseaseRecordService;

    @GetMapping("/tasks/my-tasks")
    public ResponseEntity<?> getMyTasks() {
        Long employeeUserId = Long.parseLong(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );
        return ResponseEntity.ok(taskAssignmentService.getTasksForEmployee(employeeUserId));
    }

    @GetMapping("/tasks")
    public ApiResponse<PageResponse<TaskResponse>> listAssignedTasksForCurrentEmployee(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "seasonId", required = false) Integer seasonId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(laborManagementService.listAssignedTasksForCurrentEmployee(status, seasonId, page, size));
    }

    @PatchMapping("/tasks/{taskId}/accept")
    public ApiResponse<TaskResponse> acceptTask(@PathVariable Integer taskId) {
        return ApiResponse.success(laborManagementService.acceptTask(taskId));
    }

    @PostMapping("/tasks/{taskId}/progress")
    public ApiResponse<TaskProgressLogResponse> reportTaskProgress(
            @PathVariable Integer taskId,
            @Valid @RequestBody EmployeeTaskProgressRequest request) {
        return ApiResponse.success(laborManagementService.reportTaskProgress(taskId, request));
    }

    @GetMapping("/progress")
    public ApiResponse<PageResponse<TaskProgressLogResponse>> listMyProgress(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(laborManagementService.listMyProgress(page, size));
    }

    @GetMapping("/payroll")
    public ApiResponse<PageResponse<PayrollRecordResponse>> listMyPayroll(
            @RequestParam(value = "seasonId", required = false) Integer seasonId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(laborManagementService.listMyPayroll(seasonId, page, size));
    }

    @GetMapping("/payroll/{payrollRecordId}")
    public ApiResponse<PayrollRecordResponse> getMyPayrollDetail(@PathVariable Integer payrollRecordId) {
        return ApiResponse.success(laborManagementService.getMyPayrollDetail(payrollRecordId));
    }

    @GetMapping("/seasons")
    public ApiResponse<List<MySeasonResponse>> listAssignedSeasonsForCurrentEmployee() {
        return ApiResponse.success(laborManagementService.listAssignedSeasonsForCurrentEmployee());
    }

    @GetMapping("/seasons/{seasonId}/plan")
    public ApiResponse<List<TaskResponse>> getSeasonPlanForCurrentEmployee(@PathVariable Integer seasonId) {
        return ApiResponse.success(laborManagementService.getSeasonPlanForCurrentEmployee(seasonId));
    }

    @GetMapping("/seasons/{seasonId}/field-logs")
    public ApiResponse<PageResponse<FieldLogResponse>> listFieldLogsForSeason(
            @PathVariable Integer seasonId,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(fieldLogService.listFieldLogsForAssignedEmployeeSeason(seasonId, from, to, type, q, page, size));
    }

    @GetMapping("/seasons/{seasonId}/disease-records")
    public ApiResponse<PageResponse<DiseaseRecordResponse>> listDiseaseRecordsForSeason(
            @PathVariable Integer seasonId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "severity", required = false) String severity,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "fromDetectedAt", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDetectedAt,
            @RequestParam(value = "toDetectedAt", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDetectedAt,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ApiResponse.success(diseaseRecordService.listDiseaseRecordsByAssignedEmployeeSeason(seasonId, status, severity, q, fromDetectedAt, toDetectedAt, page, size));
    }

    @PostMapping("/disease-records/{id}/ai-suggestion")
    public ApiResponse<org.example.season.dto.response.DiseaseSuggestionResponse> generateAiSuggestionForAssignedEmployee(
            @PathVariable Integer id,
            @RequestBody org.example.season.dto.request.DiseaseSuggestionRequest request) {
        return ApiResponse.success(diseaseRecordService.generateAiSuggestionForAssignedEmployee(id, request));
    }
}
