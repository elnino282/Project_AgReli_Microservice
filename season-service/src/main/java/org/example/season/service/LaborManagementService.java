package org.example.season.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.season.dto.common.PageResponse;
import org.example.season.enums.SeasonStatus;
import org.example.season.enums.TaskStatus;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.example.season.dto.request.AddSeasonEmployeeRequest;
import org.example.season.dto.request.BulkAssignSeasonEmployeesRequest;
import org.example.season.dto.request.EmployeeTaskProgressRequest;
import org.example.season.dto.request.UpdatePayrollRecordRequest;
import org.example.season.dto.request.UpdateSeasonEmployeeRequest;
import org.example.season.dto.response.EmployeeDirectoryResponse;
import org.example.season.dto.response.MySeasonResponse;
import org.example.season.dto.response.PayrollRecordResponse;
import org.example.season.dto.response.SeasonEmployeeResponse;
import org.example.season.dto.response.TaskProgressLogResponse;
import org.example.season.dto.response.TaskResponse;
import org.example.season.entity.PayrollRecord;
import org.example.season.entity.Season;
import org.example.season.entity.SeasonEmployee;
import org.example.season.entity.Task;
import org.example.season.entity.TaskProgressLog;
import org.example.season.event.DomainEventPublisher;
import org.example.season.event.TaskAssignedEvent;
import org.example.season.event.TaskCompletedEvent;
import org.example.season.repository.PayrollRecordRepository;
import org.example.season.repository.SeasonEmployeeRepository;
import org.example.season.repository.SeasonRepository;
import org.example.season.repository.TaskProgressLogRepository;
import org.example.season.repository.TaskRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
@Transactional
public class LaborManagementService {

    static final BigDecimal DEFAULT_WAGE_PER_TASK = BigDecimal.valueOf(150_000L);

    SeasonRepository seasonRepository;
    TaskRepository taskRepository;
    SeasonEmployeeRepository seasonEmployeeRepository;
    TaskProgressLogRepository taskProgressLogRepository;
    PayrollRecordRepository payrollRecordRepository;
    SeasonWorkspaceAccessService seasonWorkspaceAccessService;
    ExternalServiceClient externalServiceClient;
    AuditLogService auditLogService;
    DomainEventPublisher domainEventPublisher;

    // ---------------------------------------------------------------------
    // Farmer-side management
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<EmployeeDirectoryResponse> listEmployeeDirectory(String keyword, int page, int size) {
        ExternalServiceClient.EmployeePageResponse response = externalServiceClient.searchEmployees(keyword, page, size);
        List<EmployeeDirectoryResponse> items = response.getItems().stream()
                .map(user -> EmployeeDirectoryResponse.builder()
                        .userId(user.getId())
                        .username(user.getUsername())
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .build())
                .toList();

        PageResponse<EmployeeDirectoryResponse> pageResponse = new PageResponse<>();
        pageResponse.setItems(items);
        pageResponse.setPage(response.getPage());
        pageResponse.setSize(response.getSize());
        pageResponse.setTotalElements(response.getTotalElements());
        pageResponse.setTotalPages(response.getTotalPages());
        return pageResponse;
    }

    @Transactional(readOnly = true)
    public PageResponse<SeasonEmployeeResponse> listSeasonEmployees(Integer seasonId, String keyword, int page, int size) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending().and(Sort.by("id").descending()));
        Page<SeasonEmployee> employees = seasonEmployeeRepository.searchBySeasonAndKeyword(season.getId(), keyword, pageable);
        List<SeasonEmployeeResponse> items = employees.getContent().stream()
                .map(this::toSeasonEmployeeResponse)
                .toList();
        return PageResponse.of(employees, items);
    }

    public SeasonEmployeeResponse addSeasonEmployee(Integer seasonId, AddSeasonEmployeeRequest request) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        ensureSeasonOpenForLabor(season);
        ExternalServiceClient.UserInternalDto employee = resolveActiveEmployee(request.getEmployeeUserId());

        if (seasonEmployeeRepository.existsBySeasonIdAndEmployeeUserId(season.getId(), employee.getId())) {
            throw new AppException(ErrorCode.SEASON_EMPLOYEE_ALREADY_EXISTS);
        }

        ExternalServiceClient.UserInternalDto currentFarmer = seasonWorkspaceAccessService.getCurrentUser();

        SeasonEmployee seasonEmployee = SeasonEmployee.builder()
                .season(season)
                .employeeUserId(employee.getId())
                .employeeUsername(employee.getUsername())
                .employeeFullName(employee.getFullName())
                .employeeEmail(employee.getEmail())
                .addedByUserId(currentFarmer.getId())
                .wagePerTask(request.getWagePerTask())
                .active(true)
                .build();

        SeasonEmployee saved = seasonEmployeeRepository.save(seasonEmployee);

        notifyUser(employee.getId(),
                "Added to season workforce",
                String.format("You have been added to season %s.", season.getSeasonName()),
                "/employee/tasks");

        return toSeasonEmployeeResponse(saved);
    }

    public List<SeasonEmployeeResponse> bulkAssignSeasonEmployees(Integer seasonId, BulkAssignSeasonEmployeesRequest request) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        ensureSeasonOpenForLabor(season);

        ExternalServiceClient.UserInternalDto currentFarmer = seasonWorkspaceAccessService.getCurrentUser();
        Set<Long> uniqueEmployeeIds = new HashSet<>(request.getEmployeeUserIds());
        List<SeasonEmployeeResponse> responses = new ArrayList<>();

        List<ExternalServiceClient.UserInternalDto> activeEmployees = externalServiceClient.validateEmployeesBatch(new ArrayList<>(uniqueEmployeeIds));
        if (activeEmployees.size() != uniqueEmployeeIds.size()) {
            throw new AppException(ErrorCode.EMPLOYEE_ROLE_REQUIRED);
        }

        for (ExternalServiceClient.UserInternalDto employee : activeEmployees) {
            if (seasonEmployeeRepository.existsBySeasonIdAndEmployeeUserId(season.getId(), employee.getId())) {
                continue;
            }

            SeasonEmployee seasonEmployee = SeasonEmployee.builder()
                    .season(season)
                    .employeeUserId(employee.getId())
                    .employeeUsername(employee.getUsername())
                    .employeeFullName(employee.getFullName())
                    .employeeEmail(employee.getEmail())
                    .addedByUserId(currentFarmer.getId())
                    .wagePerTask(request.getWagePerTask())
                    .active(true)
                    .build();

            SeasonEmployee saved = seasonEmployeeRepository.save(seasonEmployee);
            responses.add(toSeasonEmployeeResponse(saved));

            notifyUser(employee.getId(),
                    "Added to season workforce",
                    String.format("You have been added to season %s.", season.getSeasonName()),
                    "/employee/tasks");
        }

        return responses;
    }

    public SeasonEmployeeResponse updateSeasonEmployee(Integer seasonId, Long employeeUserId, UpdateSeasonEmployeeRequest request) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        ensureSeasonOpenForLabor(season);
        SeasonEmployee seasonEmployee = seasonEmployeeRepository.findBySeasonIdAndEmployeeUserId(season.getId(), employeeUserId)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND));
        BigDecimal beforeWagePerTask = seasonEmployee.getWagePerTask();

        if (request.getWagePerTask() != null) {
            seasonEmployee.setWagePerTask(request.getWagePerTask());
        }
        if (request.getActive() != null) {
            seasonEmployee.setActive(request.getActive());
        }
        if (request.getIsTrained() != null) {
            boolean wasTrained = Boolean.TRUE.equals(seasonEmployee.getIsTrained());
            seasonEmployee.setIsTrained(request.getIsTrained());
            if (Boolean.TRUE.equals(request.getIsTrained())) {
                if (!wasTrained && request.getTrainedAt() == null && seasonEmployee.getTrainedAt() == null) {
                    seasonEmployee.setTrainedAt(LocalDateTime.now());
                }
            } else {
                seasonEmployee.setTrainedAt(null);
                seasonEmployee.setTrainingNotes(null);
            }
        }
        if (Boolean.TRUE.equals(seasonEmployee.getIsTrained())) {
            if (request.getTrainedAt() != null) {
                seasonEmployee.setTrainedAt(request.getTrainedAt());
            }
            if (request.getTrainingNotes() != null) {
                seasonEmployee.setTrainingNotes(request.getTrainingNotes());
            }
        }

        SeasonEmployee saved = seasonEmployeeRepository.save(seasonEmployee);

        if (hasBigDecimalChanged(beforeWagePerTask, saved.getWagePerTask())) {
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("seasonEmployeeId", saved.getId());
            snapshot.put("seasonId", saved.getSeason() != null ? saved.getSeason().getId() : null);
            snapshot.put("employeeUserId", saved.getEmployeeUserId());
            snapshot.put("beforeWagePerTask", beforeWagePerTask);
            snapshot.put("afterWagePerTask", saved.getWagePerTask());

            auditLogService.logModuleOperation(
                    "WORKFORCE",
                    "SEASON_EMPLOYEE",
                    saved.getId(),
                    "PAYROLL_WAGE_PER_TASK_UPDATED",
                    resolveAuditActor(),
                    snapshot,
                    "Farmer updated wage per task",
                    null);
        }

        return toSeasonEmployeeResponse(saved);
    }

    public void removeSeasonEmployee(Integer seasonId, Long employeeUserId) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        ensureSeasonOpenForLabor(season);
        SeasonEmployee seasonEmployee = seasonEmployeeRepository.findBySeasonIdAndEmployeeUserId(season.getId(), employeeUserId)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND));
        seasonEmployeeRepository.delete(seasonEmployee);
    }

    public TaskResponse assignTaskToEmployee(Integer taskId, Long employeeUserId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));
        Season season = task.getSeason();
        if (season == null) {
            throw new AppException(ErrorCode.SEASON_NOT_FOUND);
        }
        ensureSeasonOpenForLabor(season);

        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);

        SeasonEmployee seasonEmployee = seasonEmployeeRepository.findBySeasonIdAndEmployeeUserId(season.getId(), employeeUserId)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND));

        if (!Boolean.TRUE.equals(seasonEmployee.getActive())) {
            throw new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND);
        }

        task.setUserId(seasonEmployee.getEmployeeUserId());
        Task saved = taskRepository.save(task);

        domainEventPublisher.publish(new TaskAssignedEvent(saved));

        return toTaskResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<TaskProgressLogResponse> listSeasonProgress(Integer seasonId, Long employeeUserId, Integer taskId,
            int page, int size) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        Pageable pageable = PageRequest.of(page, size, Sort.by("loggedAt").descending().and(Sort.by("id").descending()));
        Page<TaskProgressLog> logs = taskProgressLogRepository.findBySeasonFilters(season.getId(), employeeUserId, taskId, pageable);
        List<TaskProgressLogResponse> items = logs.getContent().stream()
                .map(this::toTaskProgressLogResponse)
                .toList();
        return PageResponse.of(logs, items);
    }

    @Transactional(readOnly = true)
    public PageResponse<PayrollRecordResponse> listSeasonPayroll(Integer seasonId, Long employeeUserId, int page, int size) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        Pageable pageable = PageRequest.of(page, size, Sort.by("periodStart").descending().and(Sort.by("id").descending()));
        Page<PayrollRecord> payroll = payrollRecordRepository.findBySeasonAndEmployee(season.getId(), employeeUserId, pageable);
        List<PayrollRecordResponse> items = payroll.getContent().stream()
                .map(this::toPayrollRecordResponse)
                .toList();
        return PageResponse.of(payroll, items);
    }

    @Transactional(readOnly = true)
    public PayrollRecordResponse getSeasonPayrollDetail(Integer seasonId, Integer payrollRecordId) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        PayrollRecord payrollRecord = payrollRecordRepository.findByIdAndSeasonId(payrollRecordId, season.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        return toPayrollRecordResponse(payrollRecord);
    }

    public PayrollRecordResponse updateSeasonPayroll(
            Integer seasonId,
            Integer payrollRecordId,
            UpdatePayrollRecordRequest request) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        PayrollRecord payrollRecord = payrollRecordRepository.findByIdAndSeasonId(payrollRecordId, season.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));

        String beforeNote = normalizePayrollNote(payrollRecord.getNote());
        String afterNote = normalizePayrollNote(request.getNote());
        payrollRecord.setNote(afterNote);
        PayrollRecord saved = payrollRecordRepository.save(payrollRecord);

        if (!Objects.equals(beforeNote, afterNote)) {
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("payrollRecordId", saved.getId());
            snapshot.put("seasonId", season.getId());
            snapshot.put("employeeUserId", saved.getEmployeeUserId());
            snapshot.put("periodStart", saved.getPeriodStart());
            snapshot.put("periodEnd", saved.getPeriodEnd());
            snapshot.put("beforeNote", beforeNote);
            snapshot.put("afterNote", afterNote);

            auditLogService.logModuleOperation(
                    "WORKFORCE",
                    "PAYROLL_RECORD",
                    saved.getId(),
                    "PAYROLL_NOTE_UPDATED",
                    resolveAuditActor(),
                    snapshot,
                    "Farmer updated payroll note",
                    null);
        }

        return toPayrollRecordResponse(saved);
    }

    public List<PayrollRecordResponse> recalculatePayroll(Integer seasonId, Long employeeUserId, LocalDate periodStart,
            LocalDate periodEnd) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        ensureSeasonOpenForLabor(season);
        LocalDate resolvedStart = periodStart != null ? periodStart : LocalDate.now().withDayOfMonth(1);
        LocalDate resolvedEnd = periodEnd != null ? periodEnd : resolvedStart.withDayOfMonth(resolvedStart.lengthOfMonth());

        if (resolvedEnd.isBefore(resolvedStart)) {
            throw new AppException(ErrorCode.INVALID_DATE_RANGE);
        }

        List<SeasonEmployee> targets = new ArrayList<>();
        if (employeeUserId != null) {
            SeasonEmployee employee = seasonEmployeeRepository.findBySeasonIdAndEmployeeUserId(season.getId(), employeeUserId)
                    .orElseThrow(() -> new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND));
            targets.add(employee);
        } else {
            targets.addAll(seasonEmployeeRepository.findAllBySeasonIdAndActiveTrue(season.getId()));
        }

        List<PayrollRecordResponse> responses = new ArrayList<>();
        for (SeasonEmployee target : targets) {
            PayrollRecord record = recalculatePayrollRecord(target, season, resolvedStart, resolvedEnd);
            responses.add(toPayrollRecordResponse(record));
        }
        return responses;
    }

    // ---------------------------------------------------------------------
    // Employee-side portal
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<MySeasonResponse> listAssignedSeasonsForCurrentEmployee() {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        return seasonEmployeeRepository.findAllByEmployeeUserIdAndActiveTrue(currentEmployee.getId())
                .stream()
                .map(SeasonEmployee::getSeason)
                .filter(Objects::nonNull)
                .sorted((left, right) -> Integer.compare(
                        right.getId() != null ? right.getId() : 0,
                        left.getId() != null ? left.getId() : 0))
                .map(season -> {
                    String farmName = null;
                    Integer farmId = null;
                    if (season.getPlotId() != null) {
                        ExternalServiceClient.PlotInternalDto plot = externalServiceClient.getPlot(season.getPlotId());
                        if (plot != null) {
                            farmId = plot.getFarmId();
                            farmName = plot.getFarmName();
                        }
                    }
                    String plotName = null;
                    if (season.getPlotId() != null) {
                        ExternalServiceClient.PlotInternalDto plot = externalServiceClient.getPlot(season.getPlotId());
                        if (plot != null) {
                            plotName = plot.getPlotName();
                        }
                    }
                    return MySeasonResponse.builder()
                            .seasonId(season.getId())
                            .seasonName(season.getSeasonName())
                            .farmId(farmId)
                            .farmName(farmName)
                            .plotId(season.getPlotId())
                            .plotName(plotName)
                            .startDate(season.getStartDate())
                            .endDate(season.getEndDate())
                            .plannedHarvestDate(season.getPlannedHarvestDate())
                            .status(season.getStatus() != null ? season.getStatus().name() : null)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public Season getAssignedSeasonForCurrentEmployee(Integer seasonId) {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_NOT_FOUND));
        SeasonEmployee assignment = seasonEmployeeRepository
                .findBySeasonIdAndEmployeeUserId(season.getId(), currentEmployee.getId())
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND));
        if (!Boolean.TRUE.equals(assignment.getActive())) {
            throw new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND);
        }
        return season;
    }

    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> listAssignedTasksForCurrentEmployee(String status, Integer seasonId, int page, int size) {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        TaskStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            statusFilter = TaskStatus.fromCode(status);
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("dueDate").ascending().and(Sort.by("id").descending()));
        Page<Task> taskPage = taskRepository.findByUserIdWithFilters(currentEmployee.getId(), statusFilter, seasonId, null, pageable);

        List<TaskResponse> items = taskPage.getContent().stream()
                .map(this::toTaskResponse)
                .toList();
        return PageResponse.of(taskPage, items);
    }

    public TaskResponse acceptTask(Integer taskId) {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));
        ensureTaskBelongsToEmployee(task, currentEmployee.getId());
        ensureSeasonOpenForEmployeeTaskWrite(task.getSeason());

        if (task.getStatus() == TaskStatus.CANCELLED || task.getStatus() == TaskStatus.DONE) {
            throw new AppException(ErrorCode.INVALID_OPERATION);
        }

        if (task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.OVERDUE) {
            task.setStatus(TaskStatus.IN_PROGRESS);
            if (task.getActualStartDate() == null) {
                task.setActualStartDate(LocalDate.now());
            }
        }

        Task saved = taskRepository.save(task);
        return toTaskResponse(saved);
    }

    public TaskProgressLogResponse reportTaskProgress(Integer taskId, EmployeeTaskProgressRequest request) {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));
        ensureTaskBelongsToEmployee(task, currentEmployee.getId());
        ensureSeasonOpenForEmployeeTaskWrite(task.getSeason());
        TaskStatus previousStatus = task.getStatus();

        if (task.getStatus() == TaskStatus.CANCELLED) {
            throw new AppException(ErrorCode.INVALID_OPERATION);
        }

        if (task.getStatus() == TaskStatus.PENDING) {
            task.setStatus(TaskStatus.IN_PROGRESS);
            if (task.getActualStartDate() == null) {
                task.setActualStartDate(LocalDate.now());
            }
        }

        if (request.getProgressPercent() >= 100) {
            task.setStatus(TaskStatus.REVIEWING);
            // Actual end date is set only when DONE (approved), but we can set it now or later.
            // Let's set it when approved. But we'll leave actualStartDate check here.
            if (task.getActualStartDate() == null) {
                task.setActualStartDate(LocalDate.now());
            }
        } else if (task.getStatus() != TaskStatus.DONE && task.getStatus() != TaskStatus.REVIEWING) {
            task.setStatus(TaskStatus.IN_PROGRESS);
        }

        taskRepository.save(task);

        TaskProgressLog logEntry = TaskProgressLog.builder()
                .task(task)
                .employeeUserId(currentEmployee.getId())
                .progressPercent(request.getProgressPercent())
                .note(request.getNote())
                .evidenceUrl(request.getEvidenceUrl())
                .loggedAt(LocalDateTime.now())
                .build();

        TaskProgressLog saved = taskProgressLogRepository.save(logEntry);

        if (task.getSeason() != null && task.getSeason().getPlotId() != null) {
            ExternalServiceClient.PlotInternalDto plot = externalServiceClient.getPlot(task.getSeason().getPlotId());
            if (plot != null && plot.getOwnerUserId() != null && !plot.getOwnerUserId().equals(currentEmployee.getId())) {
                notifyUser(plot.getOwnerUserId(),
                        "Task progress updated",
                        String.format("%s updated task '%s' to %d%%.",
                                currentEmployee.getFullName() != null ? currentEmployee.getFullName()
                                        : currentEmployee.getUsername(),
                                task.getTitle(),
                                request.getProgressPercent()),
                        "/farmer/labor-management");
            }
        }

        recalculatePayrollForTask(task);
        return toTaskProgressLogResponse(saved);
    }

    public TaskResponse approveTask(Integer taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));
        ensureSeasonOpenForLabor(task.getSeason());
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(task.getSeason());

        if (task.getStatus() != TaskStatus.REVIEWING) {
            throw new AppException(ErrorCode.INVALID_OPERATION);
        }

        TaskStatus previousStatus = task.getStatus();
        task.setStatus(TaskStatus.DONE);
        task.setActualEndDate(LocalDate.now());
        Task saved = taskRepository.save(task);

        recalculatePayrollForTask(saved);
        domainEventPublisher.publish(new TaskCompletedEvent(task, previousStatus));
        return toTaskResponse(saved);
    }

    public TaskResponse rejectTask(Integer taskId, org.example.season.dto.request.RejectTaskRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));
        ensureSeasonOpenForLabor(task.getSeason());
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(task.getSeason());

        if (task.getStatus() != TaskStatus.REVIEWING) {
            throw new AppException(ErrorCode.INVALID_OPERATION);
        }

        task.setStatus(TaskStatus.IN_PROGRESS);
        Task saved = taskRepository.save(task);

        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();

        TaskProgressLog logEntry = TaskProgressLog.builder()
                .task(task)
                .employeeUserId(task.getUserId()) // It's a rejection log, we can attach to the employee's timeline
                .progressPercent(0) // or keep previous
                .note("Bị từ chối nghiệm thu: " + request.getRejectReason())
                .loggedAt(LocalDateTime.now())
                .build();
        taskProgressLogRepository.save(logEntry);

        return toTaskResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<TaskProgressLogResponse> listMyProgress(int page, int size) {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("loggedAt").descending().and(Sort.by("id").descending()));
        Page<TaskProgressLog> logs = taskProgressLogRepository.findByEmployeeUserId(currentEmployee.getId(), pageable);
        List<TaskProgressLogResponse> items = logs.getContent().stream()
                .map(this::toTaskProgressLogResponse)
                .toList();
        return PageResponse.of(logs, items);
    }

    @Transactional(readOnly = true)
    public List<TaskProgressLogResponse> getTaskProgressLogs(Integer taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));
        ensureSeasonOpenForLabor(task.getSeason());
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(task.getSeason());

        List<TaskProgressLog> logs = taskProgressLogRepository.findByTaskIdOrderByLoggedAtDesc(taskId);
        return logs.stream().map(this::toTaskProgressLogResponse).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<PayrollRecordResponse> listMyPayroll(Integer seasonId, int page, int size) {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("periodStart").descending().and(Sort.by("id").descending()));
        Page<PayrollRecord> payroll = payrollRecordRepository.findByEmployeeAndSeason(currentEmployee.getId(), seasonId, pageable);
        List<PayrollRecordResponse> items = payroll.getContent().stream()
                .map(this::toPayrollRecordResponse)
                .toList();
        return PageResponse.of(payroll, items);
    }

    @Transactional(readOnly = true)
    public PayrollRecordResponse getMyPayrollDetail(Integer payrollRecordId) {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        PayrollRecord payrollRecord = payrollRecordRepository.findByIdAndEmployeeUserId(payrollRecordId, currentEmployee.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        return toPayrollRecordResponse(payrollRecord);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getSeasonPlanForCurrentEmployee(Integer seasonId) {
        ExternalServiceClient.UserInternalDto currentEmployee = seasonWorkspaceAccessService.getCurrentUser();
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_NOT_FOUND));

        SeasonEmployee assignment = seasonEmployeeRepository.findBySeasonIdAndEmployeeUserId(season.getId(), currentEmployee.getId())
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND));

        if (!Boolean.TRUE.equals(assignment.getActive())) {
            throw new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND);
        }

        return taskRepository.findAllBySeasonId(season.getId()).stream()
                .sorted(Comparator.comparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Task::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toTaskResponse)
                .toList();
    }

    public void syncPayrollForTask(Task task) {
        recalculatePayrollForTask(task);
    }

    // ---------------------------------------------------------------------
    // Shared helpers
    // ---------------------------------------------------------------------

    private boolean isSeasonLocked(Season season) {
        if (season == null || season.getStatus() == null) {
            return false;
        }
        return season.getStatus() == SeasonStatus.COMPLETED
                || season.getStatus() == SeasonStatus.CANCELLED
                || season.getStatus() == SeasonStatus.ARCHIVED;
    }

    private void ensureSeasonOpenForLabor(Season season) {
        if (season == null) {
            throw new AppException(ErrorCode.SEASON_NOT_FOUND);
        }
        if (isSeasonLocked(season)) {
            throw new AppException(ErrorCode.INVALID_SEASON_STATUS_TRANSITION);
        }
    }

    private void ensureSeasonOpenForEmployeeTaskWrite(Season season) {
        if (season == null) {
            return;
        }
        if (isSeasonLocked(season)) {
            throw new AppException(ErrorCode.SEASON_CLOSED_CANNOT_MODIFY_TASK);
        }
    }

    private void ensureTaskBelongsToEmployee(Task task, Long employeeUserId) {
        if (task.getUserId() == null || !task.getUserId().equals(employeeUserId)) {
            throw new AppException(ErrorCode.TASK_NOT_ASSIGNED_TO_EMPLOYEE);
        }
    }

    private Season getSeasonForCurrentFarmer(Integer seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_NOT_FOUND));
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);
        return season;
    }

    private ExternalServiceClient.UserInternalDto resolveActiveEmployee(Long employeeUserId) {
        ExternalServiceClient.UserInternalDto employee = externalServiceClient.getUser(employeeUserId);
        if (employee == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        Boolean active = externalServiceClient.validateEmployee(employeeUserId);
        if (!Boolean.TRUE.equals(active)) {
            throw new AppException(ErrorCode.EMPLOYEE_ROLE_REQUIRED);
        }
        return employee;
    }

    private PayrollRecord recalculatePayrollRecord(SeasonEmployee seasonEmployee, Season season, LocalDate periodStart,
            LocalDate periodEnd) {
        List<Task> tasks = taskRepository.findAllBySeasonIdAndUserId(season.getId(), seasonEmployee.getEmployeeUserId());

        List<Task> periodTasks = tasks.stream()
                .filter(task -> {
                    LocalDate date = resolvePayrollDate(task);
                    return date != null && !date.isBefore(periodStart) && !date.isAfter(periodEnd);
                })
                .toList();

        int totalAssigned = periodTasks.size();
        int totalCompleted = (int) periodTasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.DONE)
                .count();

        BigDecimal wagePerTask = seasonEmployee.getWagePerTask() != null
                ? seasonEmployee.getWagePerTask()
                : DEFAULT_WAGE_PER_TASK;

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (Task task : periodTasks) {
            if (task.getStatus() == TaskStatus.DONE) {
                BigDecimal taskWage = task.getBaseWage() != null 
                        ? task.getBaseWage() 
                        : wagePerTask;
                totalAmount = totalAmount.add(taskWage);
            }
        }

        PayrollRecord payrollRecord = payrollRecordRepository
                .findByEmployeeUserIdAndSeasonIdAndPeriodStartAndPeriodEnd(
                        seasonEmployee.getEmployeeUserId(),
                        season.getId(),
                        periodStart,
                        periodEnd)
                .orElse(PayrollRecord.builder()
                        .employeeUserId(seasonEmployee.getEmployeeUserId())
                        .season(season)
                        .periodStart(periodStart)
                        .periodEnd(periodEnd)
                        .build());

        payrollRecord.setTotalAssignedTasks(totalAssigned);
        payrollRecord.setTotalCompletedTasks(totalCompleted);
        payrollRecord.setWagePerTask(wagePerTask);
        payrollRecord.setTotalAmount(totalAmount);
        payrollRecord.setGeneratedAt(LocalDateTime.now());
        payrollRecord.setNote("Auto-calculated from task completion data.");

        return payrollRecordRepository.save(payrollRecord);
    }

    private LocalDate resolvePayrollDate(Task task) {
        if (task.getActualEndDate() != null) {
            return task.getActualEndDate();
        }
        if (task.getDueDate() != null) {
            return task.getDueDate();
        }
        if (task.getPlannedDate() != null) {
            return task.getPlannedDate();
        }
        if (task.getCreatedAt() != null) {
            return task.getCreatedAt().toLocalDate();
        }
        return null;
    }

    private void recalculatePayrollForTask(Task task) {
        if (task.getSeason() == null || task.getUserId() == null) {
            return;
        }
        Boolean isEmployee = externalServiceClient.validateEmployee(task.getUserId());
        if (!Boolean.TRUE.equals(isEmployee)) {
            return;
        }
        seasonEmployeeRepository.findBySeasonIdAndEmployeeUserId(task.getSeason().getId(), task.getUserId())
                .ifPresent(seasonEmployee -> {
                    LocalDate dateAnchor = task.getActualEndDate() != null ? task.getActualEndDate() : LocalDate.now();
                    LocalDate periodStart = dateAnchor.withDayOfMonth(1);
                    LocalDate periodEnd = periodStart.withDayOfMonth(periodStart.lengthOfMonth());
                    recalculatePayrollRecord(seasonEmployee, task.getSeason(), periodStart, periodEnd);
                });
    }

    private void notifyUser(Long userId, String title, String message, String link) {
        if (userId == null) {
            return;
        }
        CompletableFuture.runAsync(() -> {
            try {
                externalServiceClient.createNotification(userId, title, message, link);
            } catch (Exception e) {
                log.error("Failed to send notification to user {}: {}", userId, e.getMessage());
            }
        });
    }

    private String resolveAuditActor() {
        try {
            ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();
            if (currentUser != null) {
                if (currentUser.getUsername() != null && !currentUser.getUsername().isBlank()) {
                    return currentUser.getUsername();
                }
                if (currentUser.getEmail() != null && !currentUser.getEmail().isBlank()) {
                    return currentUser.getEmail();
                }
                return currentUser.getId().toString();
            }
        } catch (Exception ignored) {
        }
        return "system";
    }

    private boolean hasBigDecimalChanged(BigDecimal before, BigDecimal after) {
        if (before == null && after == null) {
            return false;
        }
        if (before == null || after == null) {
            return true;
        }
        return before.compareTo(after) != 0;
    }

    private String normalizePayrollNote(String note) {
        if (note == null) {
            return null;
        }
        String normalized = note.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private SeasonEmployeeResponse toSeasonEmployeeResponse(SeasonEmployee seasonEmployee) {
        String employeeUsername = null;
        String employeeName = null;
        String employeeEmail = null;
        if (seasonEmployee.getEmployeeUserId() != null) {
            ExternalServiceClient.UserInternalDto user = externalServiceClient.getUser(seasonEmployee.getEmployeeUserId());
            if (user != null) {
                employeeUsername = user.getUsername();
                employeeName = user.getFullName();
                employeeEmail = user.getEmail();
            }
        }
        return SeasonEmployeeResponse.builder()
                .id(seasonEmployee.getId())
                .seasonId(seasonEmployee.getSeason() != null ? seasonEmployee.getSeason().getId() : null)
                .seasonName(seasonEmployee.getSeason() != null ? seasonEmployee.getSeason().getSeasonName() : null)
                .employeeUserId(seasonEmployee.getEmployeeUserId())
                .employeeUsername(employeeUsername)
                .employeeName(employeeName)
                .employeeEmail(employeeEmail)
                .wagePerTask(seasonEmployee.getWagePerTask())
                .active(seasonEmployee.getActive())
                .isTrained(seasonEmployee.getIsTrained())
                .trainedAt(seasonEmployee.getTrainedAt())
                .trainingNotes(seasonEmployee.getTrainingNotes())
                .createdAt(seasonEmployee.getCreatedAt())
                .build();
    }

    private TaskProgressLogResponse toTaskProgressLogResponse(TaskProgressLog logEntry) {
        Task task = logEntry.getTask();
        Season season = task != null ? task.getSeason() : null;
        String employeeName = null;
        if (logEntry.getEmployeeUserId() != null) {
            ExternalServiceClient.UserInternalDto user = externalServiceClient.getUser(logEntry.getEmployeeUserId());
            if (user != null) {
                employeeName = user.getFullName();
            }
        }
        return TaskProgressLogResponse.builder()
                .id(logEntry.getId())
                .taskId(task != null ? task.getId() : null)
                .taskTitle(task != null ? task.getTitle() : null)
                .seasonId(season != null ? season.getId() : null)
                .seasonName(season != null ? season.getSeasonName() : null)
                .employeeUserId(logEntry.getEmployeeUserId())
                .employeeName(employeeName)
                .progressPercent(logEntry.getProgressPercent())
                .note(logEntry.getNote())
                .evidenceUrl(logEntry.getEvidenceUrl())
                .loggedAt(logEntry.getLoggedAt())
                .build();
    }

    private PayrollRecordResponse toPayrollRecordResponse(PayrollRecord record) {
        String employeeName = null;
        if (record.getEmployeeUserId() != null) {
            ExternalServiceClient.UserInternalDto user = externalServiceClient.getUser(record.getEmployeeUserId());
            if (user != null) {
                employeeName = user.getFullName();
            }
        }
        return PayrollRecordResponse.builder()
                .id(record.getId())
                .seasonId(record.getSeason() != null ? record.getSeason().getId() : null)
                .seasonName(record.getSeason() != null ? record.getSeason().getSeasonName() : null)
                .employeeUserId(record.getEmployeeUserId())
                .employeeName(employeeName)
                .periodStart(record.getPeriodStart())
                .periodEnd(record.getPeriodEnd())
                .totalAssignedTasks(record.getTotalAssignedTasks())
                .totalCompletedTasks(record.getTotalCompletedTasks())
                .wagePerTask(record.getWagePerTask())
                .totalAmount(record.getTotalAmount())
                .generatedAt(record.getGeneratedAt())
                .note(record.getNote())
                .build();
    }

    private TaskResponse toTaskResponse(Task task) {
        String userName = null;
        if (task.getUserId() != null) {
            ExternalServiceClient.UserInternalDto user = externalServiceClient.getUser(task.getUserId());
            if (user != null) {
                userName = user.getUsername();
            }
        }
        return TaskResponse.builder()
                .taskId(task.getId())
                .userName(userName)
                .userId(task.getUserId())
                .seasonId(task.getSeason() != null ? task.getSeason().getId() : null)
                .seasonName(task.getSeason() != null ? task.getSeason().getSeasonName() : null)
                .title(task.getTitle())
                .description(task.getDescription())
                .plannedDate(task.getPlannedDate())
                .dueDate(task.getDueDate())
                .status(task.getStatus() != null ? task.getStatus().getCode() : null)
                .actualStartDate(task.getActualStartDate())
                .actualEndDate(task.getActualEndDate())
                .notes(task.getNotes())
                .estimatedDays(task.getEstimatedDays())
                .estimatedCompletionDate(task.getEstimatedCompletionDate())
                .plotName(task.getPlotName())
                .plotArea(task.getPlotArea())
                .baseWage(task.getBaseWage())
                .createdAt(task.getCreatedAt())
                .build();
    }
}
