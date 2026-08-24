package org.example.season.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;
import org.example.season.dto.request.StartTaskRequest;
import org.example.season.dto.request.TaskDoneRequest;
import org.example.season.dto.response.TaskResponse;
import org.example.season.entity.Season;
import org.example.season.entity.Task;
import org.example.season.enums.SeasonStatus;
import org.example.season.enums.TaskStatus;
import org.example.season.event.DomainEventPublisher;
import org.example.season.exception.AppException;
import org.example.season.repository.SeasonEmployeeRepository;
import org.example.season.repository.SeasonRepository;
import org.example.season.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * AUD-S1-004 reproduction: verify task start/done preserves actual dates.
 */
@ExtendWith(MockitoExtension.class)
class TaskWorkspaceActualDatesTest {

    @Mock TaskRepository taskRepository;
    @Mock SeasonRepository seasonRepository;
    @Mock ExternalServiceClient externalServiceClient;
    @Mock SeasonEmployeeRepository seasonEmployeeRepository;
    @Mock SeasonWorkspaceAccessService seasonWorkspaceAccessService;
    @Mock LaborManagementService laborManagementService;
    @Mock DomainEventPublisher domainEventPublisher;

    @InjectMocks TaskWorkspaceService taskWorkspaceService;

    private static final Long USER_ID = 42L;
    private Season activeSeason;
    private Task pendingTask;

    @BeforeEach
    void setUp() {
        activeSeason = Season.builder()
                .id(1)
                .seasonName("Spring 2026")
                .status(SeasonStatus.ACTIVE)
                .ownerUserId(USER_ID)
                .build();

        pendingTask = Task.builder()
                .id(10)
                .userId(USER_ID)
                .season(activeSeason)
                .title("Phun thuốc đợt 1")
                .status(TaskStatus.PENDING)
                .plannedDate(LocalDate.of(2026, 3, 1))
                .dueDate(LocalDate.of(2026, 3, 15))
                .build();

        ExternalServiceClient.UserInternalDto userDto =
                ExternalServiceClient.UserInternalDto.builder()
                        .id(USER_ID)
                        .username("farmer1")
                        .fullName("Nguyễn Văn A")
                        .build();

        when(seasonWorkspaceAccessService.getCurrentUser()).thenReturn(userDto);
    }

    @Test
    void startTaskSetsActualStartDateFromRequest() {
        LocalDate explicitStart = LocalDate.of(2026, 3, 5);

        when(taskRepository.findByIdAndUserId(10, USER_ID)).thenReturn(Optional.of(pendingTask));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(laborManagementService).syncPayrollForTask(any());
        when(externalServiceClient.getUser(USER_ID))
                .thenReturn(ExternalServiceClient.UserInternalDto.builder()
                        .id(USER_ID).username("farmer1").fullName("Nguyễn Văn A").build());

        StartTaskRequest request = StartTaskRequest.builder()
                .actualStartDate(explicitStart)
                .build();

        TaskResponse response = taskWorkspaceService.startTask(10, request);

        assertEquals("IN_PROGRESS", response.getStatus());
        assertEquals(explicitStart, response.getActualStartDate());
    }

    @Test
    void doneTaskSetsActualEndDateAndPreservesStartDate() {
        LocalDate startDate = LocalDate.of(2026, 3, 5);
        LocalDate endDate = LocalDate.of(2026, 3, 10);

        pendingTask.setActualStartDate(startDate);
        pendingTask.setStatus(TaskStatus.IN_PROGRESS);

        when(taskRepository.findByIdAndUserId(10, USER_ID)).thenReturn(Optional.of(pendingTask));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(laborManagementService).syncPayrollForTask(any());
        when(externalServiceClient.getUser(USER_ID))
                .thenReturn(ExternalServiceClient.UserInternalDto.builder()
                        .id(USER_ID).username("farmer1").fullName("Nguyễn Văn A").build());

        TaskDoneRequest request = TaskDoneRequest.builder()
                .actualEndDate(endDate)
                .build();

        TaskResponse response = taskWorkspaceService.doneTask(10, request);

        assertEquals("DONE", response.getStatus());
        assertEquals(startDate, response.getActualStartDate(),
                "actualStartDate must be preserved from start step");
        assertEquals(endDate, response.getActualEndDate(),
                "actualEndDate must reflect the done request");
    }

    @Test
    void doneTaskRejectsEndDateBeforeStartDate() {
        LocalDate startDate = LocalDate.of(2026, 3, 10);
        LocalDate invalidEndDate = LocalDate.of(2026, 3, 5);

        pendingTask.setActualStartDate(startDate);
        pendingTask.setStatus(TaskStatus.IN_PROGRESS);

        when(taskRepository.findByIdAndUserId(10, USER_ID)).thenReturn(Optional.of(pendingTask));

        TaskDoneRequest request = TaskDoneRequest.builder()
                .actualEndDate(invalidEndDate)
                .build();

        assertThrows(AppException.class,
                () -> taskWorkspaceService.doneTask(10, request),
                "End date before start date must be rejected");
    }
}
