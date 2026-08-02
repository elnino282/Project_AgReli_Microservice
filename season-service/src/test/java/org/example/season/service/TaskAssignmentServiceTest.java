package org.example.season.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.example.season.client.FarmServiceClient;
import org.example.season.dto.response.SeasonEmployeeResponse;
import org.example.season.entity.Season;
import org.example.season.entity.SeasonEmployee;
import org.example.season.entity.Task;
import org.example.season.entity.WorkTeamMember;
import org.example.season.repository.SeasonEmployeeRepository;
import org.example.season.repository.TaskRepository;
import org.example.season.repository.WorkTeamMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class TaskAssignmentServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private WorkTeamMemberRepository workTeamMemberRepository;
    @Mock
    private FarmServiceClient farmServiceClient;
    @Mock
    private SeasonEmployeeRepository seasonEmployeeRepository;

    @InjectMocks
    private TaskAssignmentService taskAssignmentService;

    private Season season;
    private SeasonEmployee untrainedEmployee;
    private SeasonEmployee trainedEmployee;

    @BeforeEach
    void setUp() {
        season = Season.builder().id(1).seasonName("Spring 2026").build();

        untrainedEmployee = SeasonEmployee.builder()
                .id(1)
                .season(season)
                .employeeUserId(101L)
                .employeeFullName("Alice Untrained")
                .isTrained(false)
                .active(true)
                .build();

        trainedEmployee = SeasonEmployee.builder()
                .id(2)
                .season(season)
                .employeeUserId(102L)
                .employeeFullName("Bob Trained")
                .isTrained(true)
                .active(true)
                .build();
    }

    @Test
    void testGetEligibleAssignees_NoTask_NoTeam() {
        when(seasonEmployeeRepository.findEligibleAssigneesBySeasonId(1))
                .thenReturn(List.of(trainedEmployee, untrainedEmployee));

        List<SeasonEmployeeResponse> result = taskAssignmentService.getEligibleAssignees(1, null, null);

        assertEquals(2, result.size());
        assertTrue(result.get(0).getIsTrained(), "Trained employee should be first");
        assertEquals("Bob Trained", result.get(0).getEmployeeName());
        assertEquals("Alice Untrained", result.get(1).getEmployeeName());
    }

    @Test
    void testGetEligibleAssignees_WithWorkTeam() {
        WorkTeamMember member1 = WorkTeamMember.builder().employeeUserId(102L).build();
        when(workTeamMemberRepository.findByWorkTeamIdIn(List.of(5L)))
                .thenReturn(List.of(member1));
        when(seasonEmployeeRepository.findEligibleAssigneesBySeasonIdAndUserIds(1, List.of(102L)))
                .thenReturn(List.of(trainedEmployee));

        List<SeasonEmployeeResponse> result = taskAssignmentService.getEligibleAssignees(1, null, 5L);

        assertEquals(1, result.size());
        assertEquals("Bob Trained", result.get(0).getEmployeeName());
        assertTrue(result.get(0).getIsTrained());
    }

    @Test
    void testGetEligibleAssignees_WithTaskId() {
        Task task = Task.builder().id(10).workTeamId(5L).build();
        when(taskRepository.findById(10)).thenReturn(Optional.of(task));

        WorkTeamMember member1 = WorkTeamMember.builder().employeeUserId(102L).build();
        when(workTeamMemberRepository.findByWorkTeamIdIn(List.of(5L)))
                .thenReturn(List.of(member1));
        when(seasonEmployeeRepository.findEligibleAssigneesBySeasonIdAndUserIds(1, List.of(102L)))
                .thenReturn(List.of(trainedEmployee));

        List<SeasonEmployeeResponse> result = taskAssignmentService.getEligibleAssignees(1, 10, null);

        assertEquals(1, result.size());
        assertEquals("Bob Trained", result.get(0).getEmployeeName());
    }
}
