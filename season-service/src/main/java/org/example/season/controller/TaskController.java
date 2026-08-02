package org.example.season.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.season.dto.common.ApiResponse;
import org.example.season.dto.common.PageResponse;
import org.example.season.dto.request.CreateTaskRequest;
import org.example.season.dto.request.UpdateTaskRequest;
import org.example.season.dto.request.UpdateTaskStatusRequest;
import org.example.season.dto.response.TaskResponse;
import org.example.season.service.SeasonTaskService;
import org.example.season.service.TaskAssignmentService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
public class TaskController {

    SeasonTaskService seasonTaskService;
    TaskAssignmentService taskAssignmentService;

    @Operation(summary = "List tasks of a season", description = "List tasks for a given season of the current farmer")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Success"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Season not found")
    })
    @GetMapping("/seasons/{seasonId}/tasks")
    public ApiResponse<PageResponse<TaskResponse>> listTasks(
            @PathVariable Integer seasonId,
            @RequestParam(value = "status", required = false) String status,
            @Parameter(description = "From date (yyyy-MM-dd)")
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "To date (yyyy-MM-dd)")
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Page index (0-based)")
            @RequestParam(value = "page", defaultValue = "0") int page,
            @Parameter(description = "Page size")
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        return ApiResponse.success(seasonTaskService.listTasksForSeason(seasonId, status, from, to, page, size));
    }

    @Operation(summary = "Create task in season", description = "Create a new task within given season for current farmer")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Success"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad Request"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Season not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Conflict")
    })
    @PostMapping("/seasons/{seasonId}/tasks")
    public ApiResponse<TaskResponse> createTask(
            @PathVariable Integer seasonId,
            @Valid @RequestBody CreateTaskRequest request
    ) {
        return ApiResponse.success(seasonTaskService.createTask(seasonId, request));
    }

    @Operation(summary = "Get task detail", description = "Get task detail if its season belongs to current farmer")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Success"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Task not found")
    })
    @GetMapping("/tasks/{id}")
    public ApiResponse<TaskResponse> getTask(@PathVariable Integer id) {
        return ApiResponse.success(seasonTaskService.getTask(id));
    }

    @Operation(summary = "Update task", description = "Update task details while task and season are still editable")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Success"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad Request"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PutMapping("/tasks/{id}")
    public ApiResponse<TaskResponse> updateTask(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateTaskRequest request
    ) {
        return ApiResponse.success(seasonTaskService.updateTask(id, request));
    }

    @Operation(summary = "Update task status", description = "Update task status with validation of allowed transitions")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Success"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad Request"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Task not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Conflict")
    })
    @PatchMapping("/tasks/{id}/status")
    public ApiResponse<TaskResponse> updateTaskStatus(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateTaskStatusRequest request
    ) {
        return ApiResponse.success(seasonTaskService.updateTaskStatus(id, request));
    }

    @Operation(summary = "Delete task", description = "Delete task if allowed by status and season constraints")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Success"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad Request"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Task not found")
    })
    @DeleteMapping("/tasks/{id}")
    public ApiResponse<Void> deleteTask(@PathVariable Integer id) {
        seasonTaskService.deleteTask(id);
        return ApiResponse.success(null);
    }

    @Operation(summary = "Get eligible assignees", description = "Get eligible assignees for a season, optionally filtered by task or team")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Success"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Season not found")
    })
    @GetMapping("/seasons/{seasonId}/eligible-assignees")
    public ApiResponse<java.util.List<org.example.season.dto.response.SeasonEmployeeResponse>> getEligibleAssignees(
            @PathVariable Integer seasonId,
            @RequestParam(required = false) Integer taskId,
            @RequestParam(required = false) Long workTeamId) {
        return ApiResponse.success(taskAssignmentService.getEligibleAssignees(seasonId, taskId, workTeamId));
    }
}
