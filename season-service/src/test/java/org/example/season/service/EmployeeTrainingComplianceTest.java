package org.example.season.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import org.example.season.dto.response.TrainingComplianceSnapshotDto;
import org.example.season.entity.EmployeeTrainingRecord;
import org.example.season.entity.SeasonEmployee;
import org.example.season.entity.TrainingProgram;
import org.example.season.entity.WorkTeam;
import org.example.season.entity.WorkTeamMember;
import org.example.season.repository.EmployeeTrainingRecordRepository;
import org.example.season.repository.SeasonEmployeeRepository;
import org.example.season.repository.TrainingProgramRepository;
import org.example.season.repository.WorkTeamMemberRepository;
import org.example.season.repository.WorkTeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EmployeeTrainingComplianceTest {

    @Mock
    TrainingProgramRepository trainingProgramRepository;
    @Mock
    EmployeeTrainingRecordRepository employeeTrainingRecordRepository;
    @Mock
    SeasonEmployeeRepository seasonEmployeeRepository;
    @Mock
    WorkTeamRepository workTeamRepository;
    @Mock
    WorkTeamMemberRepository workTeamMemberRepository;

    @InjectMocks
    EmployeeTrainingService employeeTrainingService;

    private final WorkTeam team = WorkTeam.builder().id(11L).seasonId(1L).build();
    private final TrainingProgram safety = TrainingProgram.builder()
            .id(101).title("An toàn BVTV").category("SAFETY").isMandatory(true).build();
    private final TrainingProgram operations = TrainingProgram.builder()
            .id(102).title("Thu hoạch").category("OPERATIONS").isMandatory(true).build();

    @BeforeEach
    void setUp() {
        when(seasonEmployeeRepository.findAllBySeasonIdAndActiveTrue(1)).thenReturn(List.of());
        when(workTeamRepository.findBySeasonId(1L)).thenReturn(List.of(team));
        when(trainingProgramRepository.findByIsMandatoryTrue()).thenReturn(List.of(safety, operations));
    }

    @Test
    void memberWithoutRecordsIsNotCompliant() {
        stubMembers(201L);
        when(employeeTrainingRecordRepository.findByUserIdIn(List.of(201L))).thenReturn(List.of());

        TrainingComplianceSnapshotDto result = employeeTrainingService.getTrainingComplianceForSeason(1);

        assertThat(result.getTotalMembers()).isEqualTo(1);
        assertThat(result.getCompliantMembers()).isZero();
        assertThat(result.getCompliant()).isFalse();
    }

    @Test
    void partialMandatoryProgramCoverageIsNotCompliant() {
        stubMembers(201L);
        when(employeeTrainingRecordRepository.findByUserIdIn(List.of(201L)))
                .thenReturn(List.of(validRecord(201L, safety)));

        TrainingComplianceSnapshotDto result = employeeTrainingService.getTrainingComplianceForSeason(1);

        assertThat(result.getMemberCompliance()).containsEntry(201L, false);
        assertThat(result.getCompliant()).isFalse();
    }

    @Test
    void expiredOrEvidenceFreeRecordIsNotCompliant() {
        stubMembers(201L);
        EmployeeTrainingRecord expired = validRecord(201L, safety);
        expired.setCertifiedUntil(LocalDate.now().minusDays(1));
        EmployeeTrainingRecord noEvidence = validRecord(201L, operations);
        noEvidence.setEvidenceUrls(List.of());
        when(employeeTrainingRecordRepository.findByUserIdIn(List.of(201L)))
                .thenReturn(List.of(expired, noEvidence));

        TrainingComplianceSnapshotDto result = employeeTrainingService.getTrainingComplianceForSeason(1);

        assertThat(result.getCompliant()).isFalse();
    }

    @Test
    void everyMemberWithAllCurrentEvidenceIsCompliant() {
        stubMembers(201L, 202L);
        when(employeeTrainingRecordRepository.findByUserIdIn(List.of(201L, 202L)))
                .thenReturn(List.of(
                        validRecord(201L, safety), validRecord(201L, operations),
                        validRecord(202L, safety), validRecord(202L, operations)));

        TrainingComplianceSnapshotDto result = employeeTrainingService.getTrainingComplianceForSeason(1);

        assertThat(result.getTotalMembers()).isEqualTo(2);
        assertThat(result.getCompliantMembers()).isEqualTo(2);
        assertThat(result.getRequiredCategories()).containsExactly("SAFETY", "OPERATIONS");
        assertThat(result.getCompliant()).isTrue();
    }

    @Test
    void activeSeasonAssigneeOutsideWorkTeamIsIncludedInCoverage() {
        stubMembers(201L);
        when(seasonEmployeeRepository.findAllBySeasonIdAndActiveTrue(1))
                .thenReturn(List.of(SeasonEmployee.builder().employeeUserId(202L).active(true).build()));
        when(employeeTrainingRecordRepository.findByUserIdIn(List.of(202L, 201L)))
                .thenReturn(List.of(validRecord(201L, safety), validRecord(201L, operations)));

        TrainingComplianceSnapshotDto result = employeeTrainingService.getTrainingComplianceForSeason(1);

        assertThat(result.getTotalMembers()).isEqualTo(2);
        assertThat(result.getMemberCompliance()).containsEntry(202L, false);
        assertThat(result.getCompliant()).isFalse();
    }

    private void stubMembers(Long... userIds) {
        when(workTeamMemberRepository.findByWorkTeamIdIn(List.of(11L)))
                .thenReturn(java.util.Arrays.stream(userIds)
                        .map(userId -> WorkTeamMember.builder().workTeam(team).employeeUserId(userId).build())
                        .toList());
    }

    private EmployeeTrainingRecord validRecord(Long userId, TrainingProgram program) {
        return EmployeeTrainingRecord.builder()
                .userId(userId)
                .trainingProgram(program)
                .trainedAt(LocalDate.now().minusDays(30))
                .certifiedUntil(LocalDate.now().plusDays(30))
                .status("COMPLETED")
                .evidenceUrls(List.of("https://evidence.example/record.pdf"))
                .build();
    }
}
