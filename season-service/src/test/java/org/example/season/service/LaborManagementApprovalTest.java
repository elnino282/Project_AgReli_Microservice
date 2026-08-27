package org.example.season.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.example.season.entity.PayrollRecord;
import org.example.season.entity.Season;
import org.example.season.entity.SeasonEmployee;
import org.example.season.entity.Task;
import org.example.season.enums.SeasonStatus;
import org.example.season.enums.TaskStatus;
import org.example.season.event.DomainEventPublisher;
import org.example.season.event.TaskCompletedEvent;
import org.example.season.repository.PayrollRecordRepository;
import org.example.season.repository.SeasonEmployeeRepository;
import org.example.season.repository.SeasonRepository;
import org.example.season.repository.TaskProgressLogRepository;
import org.example.season.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LaborManagementApprovalTest {

    @Mock
    SeasonRepository seasonRepository;
    @Mock
    TaskRepository taskRepository;
    @Mock
    SeasonEmployeeRepository seasonEmployeeRepository;
    @Mock
    TaskProgressLogRepository taskProgressLogRepository;
    @Mock
    PayrollRecordRepository payrollRecordRepository;
    @Mock
    SeasonWorkspaceAccessService seasonWorkspaceAccessService;
    @Mock
    ExternalServiceClient externalServiceClient;
    @Mock
    AuditLogService auditLogService;
    @Mock
    DomainEventPublisher domainEventPublisher;

    @InjectMocks
    LaborManagementService laborManagementService;

    @Test
    void approveTaskCompletesTaskAndRecalculatesPayroll() {
        Season season = Season.builder()
                .id(10)
                .seasonName("Vụ hè 2026")
                .status(SeasonStatus.ACTIVE)
                .build();
        Task task = Task.builder()
                .id(20)
                .season(season)
                .userId(30L)
                .title("Thu hoạch")
                .status(TaskStatus.REVIEWING)
                .baseWage(new BigDecimal("250000"))
                .build();
        SeasonEmployee employee = SeasonEmployee.builder()
                .season(season)
                .employeeUserId(30L)
                .wagePerTask(new BigDecimal("150000"))
                .active(true)
                .build();

        when(taskRepository.findById(20)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(externalServiceClient.validateEmployee(30L)).thenReturn(true);
        when(seasonEmployeeRepository.findBySeasonIdAndEmployeeUserId(10, 30L))
                .thenReturn(Optional.of(employee));
        when(taskRepository.findAllBySeasonIdAndUserId(10, 30L)).thenReturn(List.of(task));
        when(payrollRecordRepository.findByEmployeeUserIdAndSeasonIdAndPeriodStartAndPeriodEnd(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(payrollRecordRepository.save(any(PayrollRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        laborManagementService.approveTask(20);

        assertEquals(TaskStatus.DONE, task.getStatus());
        assertNotNull(task.getActualEndDate());
        ArgumentCaptor<PayrollRecord> payrollCaptor = ArgumentCaptor.forClass(PayrollRecord.class);
        verify(payrollRecordRepository).save(payrollCaptor.capture());
        PayrollRecord payroll = payrollCaptor.getValue();
        assertEquals(1, payroll.getTotalAssignedTasks());
        assertEquals(1, payroll.getTotalCompletedTasks());
        assertEquals(0, new BigDecimal("250000").compareTo(payroll.getTotalAmount()));
        assertEquals(LocalDate.now().withDayOfMonth(1), payroll.getPeriodStart());
        verify(domainEventPublisher).publish(any(TaskCompletedEvent.class));
    }
}
