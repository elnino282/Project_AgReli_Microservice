package org.example.season.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.season.event.DomainEventPublisher;
import org.example.season.event.TaskAssignedEvent;
import org.example.season.event.TaskCompletedEvent;
import org.example.season.constant.PredefinedRole;
import org.example.season.dto.common.PageResponse;
import org.example.season.enums.SeasonStatus;
import org.example.season.enums.TaskStatus;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.example.season.dto.request.CreateTaskRequest;
import org.example.season.dto.request.StartTaskRequest;
import org.example.season.dto.request.TaskDoneRequest;
import org.example.season.dto.request.UpdateTaskRequest;
import org.example.season.dto.response.SeasonMinimalResponse;
import org.example.season.dto.response.TaskResponse;
import org.example.season.entity.Season;
import org.example.season.entity.Task;
import org.example.season.repository.SeasonEmployeeRepository;
import org.example.season.repository.SeasonRepository;
import org.example.season.repository.TaskRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for Tasks Workspace - user-scoped task management.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class TaskWorkspaceService {

    TaskRepository taskRepository;
    SeasonRepository seasonRepository;
    ExternalServiceClient externalServiceClient;
    SeasonEmployeeRepository seasonEmployeeRepository;
    SeasonWorkspaceAccessService seasonWorkspaceAccessService;
    LaborManagementService laborManagementService;
    DomainEventPublisher domainEventPublisher;

    /**
     * Create a new task for the current user.
     */
    @Transactional
    public TaskResponse createTask(CreateTaskRequest request) {
        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();

        // Validate dates
        validateTaskDates(request.getPlannedDate(), request.getDueDate(), null, null);

        // Validate season ownership if seasonId is provided
        Season season = null;
        if (request.getSeasonId() != null) {
            season = seasonRepository.findById(request.getSeasonId())
                    .orElseThrow(() -> new AppException(ErrorCode.SEASON_NOT_FOUND));
            seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);
            ensureSeasonOpenForWorkspaceTask(season, true);
        }
        ExternalServiceClient.UserInternalDto assignee = resolveWorkspaceAssignee(request.getAssigneeUserId(), currentUser, season);

        // Populate denormalized fields for DashboardTaskView (avoids cross-schema JOINs)
        String plotName = null;
        java.math.BigDecimal plotArea = null;
        if (season != null && season.getPlotId() != null) {
            try {
                ExternalServiceClient.PlotInternalDto plotDto = externalServiceClient.getPlot(season.getPlotId());
                if (plotDto != null) {
                    plotName = plotDto.getPlotName();
                    plotArea = plotDto.getPlotArea();
                }
            } catch (Exception ignored) {
            }
        }

        // Build task
        Task task = Task.builder()
                .userId(assignee.getId())
                .assigneeName(assignee.getFullName())
                .plotName(plotName)
                .plotArea(plotArea)
                .season(season)
                .title(request.getTitle())
                .description(request.getDescription())
                .plannedDate(request.getPlannedDate())
                .dueDate(request.getDueDate())
                .notes(request.getNotes())
                .status(TaskStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        // Check if task should be OVERDUE immediately
        if (task.getDueDate() != null && task.getDueDate().isBefore(LocalDate.now())) {
            task.setStatus(TaskStatus.OVERDUE);
        }

        task = taskRepository.save(task);
        log.info("Created task {} for user {}", task.getId(), currentUser.getId());
        domainEventPublisher.publish(new TaskAssignedEvent(task));

        return mapToResponse(task);
    }

    /**
     * List tasks for current user with filters and pagination.
     */
    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> listTasks(
            TaskStatus status,
            Integer seasonId,
            String searchQuery,
            Integer page,
            Integer size,
            String sortBy,
            String sortDirection) {
        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();

        // Auto-update overdue tasks before listing
        updateOverdueTasksForUser(currentUser.getId());

        // Build pagination
        Sort sort = Sort.by(
                "desc".equalsIgnoreCase(sortDirection) ? Sort.Direction.DESC : Sort.Direction.ASC,
                sortBy != null ? sortBy : "createdAt");
        Pageable pageable = PageRequest.of(page != null ? page : 0, size != null ? size : 20, sort);

        // Execute query with filters
        Page<Task> taskPage = taskRepository.findByUserIdWithFilters(
                currentUser.getId(),
                status,
                seasonId,
                searchQuery,
                pageable);

        List<TaskResponse> responses = taskPage.getContent().stream()
                .map(this::mapToResponse)
                .toList();

        PageResponse<TaskResponse> response = new PageResponse<>();
        response.setItems(responses);
        response.setPage(taskPage.getNumber());
        response.setSize(taskPage.getSize());
        response.setTotalElements(taskPage.getTotalElements());
        response.setTotalPages(taskPage.getTotalPages());
        return response;
    }

    /**
     * Get task by ID (must belong to current user).
     */
    @Transactional(readOnly = true)
    public TaskResponse getTask(Integer taskId) {
        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));

        return mapToResponse(task);
    }

    /**
     * Update task details.
     */
    @Transactional
    public TaskResponse updateTask(Integer taskId, UpdateTaskRequest request) {
        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        ensureSeasonOpenForWorkspaceTask(task.getSeason(), false);

        // Cannot update CANCELLED tasks
        if (task.getStatus() == TaskStatus.CANCELLED) {
            throw new AppException(ErrorCode.INVALID_OPERATION);
        }

        // Validate dates
        validateTaskDates(
                request.getPlannedDate(),
                request.getDueDate(),
                task.getActualStartDate(),
                task.getActualEndDate());

        // Validate season ownership if changed
        if (request.getSeasonId() != null && !request.getSeasonId().equals(
                task.getSeason() != null ? task.getSeason().getId() : null)) {
            Season newSeason = seasonRepository.findById(request.getSeasonId())
                    .orElseThrow(() -> new AppException(ErrorCode.SEASON_NOT_FOUND));
            seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(newSeason);
            ensureSeasonOpenForWorkspaceTask(newSeason, false);
            task.setSeason(newSeason);
        } else if (request.getSeasonId() == null) {
            task.setSeason(null);
        }

        // Update fields
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPlannedDate(request.getPlannedDate());
        task.setDueDate(request.getDueDate());
        task.setNotes(request.getNotes());
        boolean assigneeChanged = false;
        if (request.getAssigneeUserId() != null) {
            ExternalServiceClient.UserInternalDto assignee = resolveWorkspaceAssignee(request.getAssigneeUserId(), currentUser, task.getSeason());
            if (!assignee.getId().equals(task.getUserId())) {
                task.setUserId(assignee.getId());
                assigneeChanged = true;
            }
        }

        // Recheck overdue status
        if (task.getStatus() == TaskStatus.OVERDUE) {
            // If due date is now in future, revert to IN_PROGRESS or PENDING
            if (task.getDueDate() == null || !task.getDueDate().isBefore(LocalDate.now())) {
                if (task.getActualStartDate() != null) {
                    task.setStatus(TaskStatus.IN_PROGRESS);
                } else {
                    task.setStatus(TaskStatus.PENDING);
                }
            }
        } else if (task.getStatus() != TaskStatus.DONE && task.getStatus() != TaskStatus.CANCELLED) {
            // Check if it should become overdue
            if (task.getDueDate() != null && task.getDueDate().isBefore(LocalDate.now())) {
                task.setStatus(TaskStatus.OVERDUE);
            }
        }

        task = taskRepository.save(task);
        laborManagementService.syncPayrollForTask(task);
        if (assigneeChanged) {
            domainEventPublisher.publish(new TaskAssignedEvent(task));
        }
        log.info("Updated task {}", taskId);

        return mapToResponse(task);
    }

    /**
     * Start a task (set actualStartDate and status to IN_PROGRESS).
     */
    @Transactional
    public TaskResponse startTask(Integer taskId, StartTaskRequest request) {
        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        ensureSeasonOpenForWorkspaceTask(task.getSeason(), false);

        // Cannot start DONE or CANCELLED tasks
        if (task.getStatus() == TaskStatus.DONE || task.getStatus() == TaskStatus.CANCELLED) {
            throw new AppException(ErrorCode.INVALID_OPERATION);
        }

        LocalDate startDate = request.getActualStartDate() != null ? request.getActualStartDate() : LocalDate.now();
        task.setActualStartDate(startDate);
        task.setStatus(TaskStatus.IN_PROGRESS);

        task = taskRepository.save(task);
        laborManagementService.syncPayrollForTask(task);
        log.info("Started task {}", taskId);

        return mapToResponse(task);
    }

    /**
     * Mark task as done (set actualEndDate and status to DONE).
     */
    @Transactional
    public TaskResponse doneTask(Integer taskId, TaskDoneRequest request) {
        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        ensureSeasonOpenForWorkspaceTask(task.getSeason(), false);

        // Cannot mark CANCELLED tasks as done
        if (task.getStatus() == TaskStatus.CANCELLED) {
            throw new AppException(ErrorCode.INVALID_OPERATION);
        }

        LocalDate endDate = request.getActualEndDate() != null ? request.getActualEndDate() : LocalDate.now();
        TaskStatus previousStatus = task.getStatus();

        // Validate end date >= start date
        if (task.getActualStartDate() != null && endDate.isBefore(task.getActualStartDate())) {
            throw new AppException(ErrorCode.INVALID_DATE_RANGE);
        }

        task.setActualEndDate(endDate);
        task.setStatus(TaskStatus.DONE);

        task = taskRepository.save(task);
        laborManagementService.syncPayrollForTask(task);
        if (previousStatus != TaskStatus.DONE) {
            domainEventPublisher.publish(new TaskCompletedEvent(task, previousStatus));
        }
        log.info("Marked task {} as done", taskId);

        return mapToResponse(task);
    }

    /**
     * Cancel a task.
     */
    @Transactional
    public TaskResponse cancelTask(Integer taskId) {
        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        ensureSeasonOpenForWorkspaceTask(task.getSeason(), false);

        task.setStatus(TaskStatus.CANCELLED);
        task = taskRepository.save(task);
        log.info("Cancelled task {}", taskId);

        return mapToResponse(task);
    }

    /**
     * Delete a task (hard delete, dev only).
     */
    @Transactional
    public void deleteTask(Integer taskId) {
        ExternalServiceClient.UserInternalDto currentUser = seasonWorkspaceAccessService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        ensureSeasonOpenForWorkspaceTask(task.getSeason(), false);

        taskRepository.delete(task);
        log.info("Deleted task {}", taskId);
    }

    /**
     * Get user's seasons for dropdown (minimal data).
     */
    @Transactional(readOnly = true)
    public List<SeasonMinimalResponse> getUserSeasons() {
        List<Integer> accessibleFarmIds = seasonWorkspaceAccessService.getAccessibleFarmIdsForCurrentUser();

        // Let's resolve the plots from the farm IDs and get seasons of those plots.
        // Wait, seasonRepository has findAllByPlotIdIn(plotIds)
        // Let's query all seasons, then filter by plot's farm id since we don't have plot-to-farm joins in Microservice.
        // Or we can get plot details from externalServiceClient.
        List<Season> allSeasons = seasonRepository.findAll();
        return allSeasons.stream()
                .filter(season -> {
                    if (season.getPlotId() == null) return false;
                    ExternalServiceClient.PlotInternalDto plot = externalServiceClient.getPlot(season.getPlotId());
                    return plot != null && accessibleFarmIds.contains(plot.getFarmId());
                })
                .map(season -> {
                    ExternalServiceClient.PlotInternalDto plot = externalServiceClient.getPlot(season.getPlotId());
                    return SeasonMinimalResponse.builder()
                            .seasonId(season.getId())
                            .seasonName(season.getSeasonName())
                            .farmId(plot != null ? plot.getFarmId() : null)
                            .farmName(plot != null ? plot.getFarmName() : null)
                            .plotId(season.getPlotId())
                            .plotName(plot != null ? plot.getPlotName() : null)
                            .startDate(season.getStartDate())
                            .endDate(season.getEndDate())
                            .plannedHarvestDate(season.getPlannedHarvestDate())
                            .build();
                })
                .toList();
    }

    // ==================== Helper Methods ====================

    private void ensureSeasonOpenForWorkspaceTask(Season season, boolean forCreate) {
        if (season == null || season.getStatus() == null) {
            return;
        }
        if (season.getStatus() == SeasonStatus.COMPLETED
                || season.getStatus() == SeasonStatus.CANCELLED
                || season.getStatus() == SeasonStatus.ARCHIVED) {
            if (forCreate) {
                throw new AppException(ErrorCode.SEASON_CLOSED_CANNOT_ADD_TASK);
            }
            throw new AppException(ErrorCode.SEASON_CLOSED_CANNOT_MODIFY_TASK);
        }
    }

    /**
     * Auto-update overdue tasks for a specific user.
     */
    private void updateOverdueTasksForUser(Long userId) {
        List<Task> overdueCandidate = taskRepository.findByUserIdWithFilters(
                userId,
                null,
                null,
                null,
                Pageable.unpaged()).getContent();

        for (Task task : overdueCandidate) {
            if (task.getDueDate() != null &&
                    task.getDueDate().isBefore(LocalDate.now()) &&
                    (task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.IN_PROGRESS)) {
                task.setStatus(TaskStatus.OVERDUE);
                taskRepository.save(task);
            }
        }
    }

    /**
     * Validate task dates.
     */
    private void validateTaskDates(LocalDate plannedDate, LocalDate dueDate,
            LocalDate actualStartDate, LocalDate actualEndDate) {
        // Due date must be >= planned date
        if (plannedDate != null && dueDate != null && dueDate.isBefore(plannedDate)) {
            throw new AppException(ErrorCode.INVALID_DATE_RANGE);
        }

        // Actual end must be >= actual start
        if (actualStartDate != null && actualEndDate != null && actualEndDate.isBefore(actualStartDate)) {
            throw new AppException(ErrorCode.INVALID_DATE_RANGE);
        }
    }

    /**
     * Map Task entity to TaskResponse DTO.
     */
    private TaskResponse mapToResponse(Task task) {
        String username = null;
        if (task.getUserId() != null) {
            ExternalServiceClient.UserInternalDto user = externalServiceClient.getUser(task.getUserId());
            if (user != null) {
                username = user.getUsername();
            }
        }
        return TaskResponse.builder()
                .taskId(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus() != null ? task.getStatus().getCode() : null)
                .plannedDate(task.getPlannedDate())
                .dueDate(task.getDueDate())
                .actualStartDate(task.getActualStartDate())
                .actualEndDate(task.getActualEndDate())
                .notes(task.getNotes())
                .seasonId(task.getSeason() != null ? task.getSeason().getId() : null)
                .seasonName(task.getSeason() != null ? task.getSeason().getSeasonName() : null)
                .userId(task.getUserId())
                .userName(username)
                .baseWage(task.getBaseWage())
                .createdAt(task.getCreatedAt())
                .build();
    }

    private ExternalServiceClient.UserInternalDto resolveWorkspaceAssignee(
            Long assigneeUserId,
            ExternalServiceClient.UserInternalDto fallbackAssignee,
            Season season) {
        if (assigneeUserId == null) {
            return fallbackAssignee;
        }

        ExternalServiceClient.UserInternalDto assignee = externalServiceClient.getUser(assigneeUserId);
        if (assignee == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        Boolean hasEmployeeRole = externalServiceClient.validateEmployee(assignee.getId());
        if (!Boolean.TRUE.equals(hasEmployeeRole)) {
            throw new AppException(ErrorCode.EMPLOYEE_ROLE_REQUIRED);
        }

        if (season != null) {
            boolean isSeasonEmployee = seasonEmployeeRepository.existsBySeasonIdAndEmployeeUserId(season.getId(), assignee.getId());
            if (!isSeasonEmployee) {
                throw new AppException(ErrorCode.SEASON_EMPLOYEE_NOT_FOUND);
            }
        }

        return assignee;
    }
}
