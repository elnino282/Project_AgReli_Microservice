package org.example.farm.service;

import org.example.farm.client.SeasonServiceClient;
import org.example.farm.client.SustainabilityServiceClient;
import org.example.farm.entity.CertificationChecklistItem;
import org.example.farm.entity.CertificationItemStatus;
import org.example.farm.entity.Plot;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.PlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CertificationScoringServiceTest {

    @Mock
    private PlotRepository plotRepository;
    @Mock
    private SeasonServiceClient seasonServiceClient;
    @Mock
    private SustainabilityServiceClient sustainabilityServiceClient;

    private CertificationScoringService service;

    @BeforeEach
    void setUp() {
        service = new CertificationScoringService(
                plotRepository, seasonServiceClient, sustainabilityServiceClient);
    }

    @Test
    void seasonDiscoveryUnavailable_keepsPhiPendingAndReturnsTypedUnavailable() {
        CertificationItemStatus status = pendingPhiStatus();
        when(plotRepository.findAllByFarm_Id(1)).thenReturn(List.of(Plot.builder().id(10).build()));
        when(seasonServiceClient.getSeasonsByPlotId(10))
                .thenThrow(new IllegalStateException("season-service unavailable"));

        assertThatThrownBy(() -> service.autoPopulateFromFieldLogs(1, List.of(status), List.of(phiItem())))
                .isInstanceOfSatisfying(AppException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE));
        assertThat(status.getStatus()).isEqualTo("PENDING");
        assertThat(status.getCheckedAt()).isNull();
    }

    @Test
    void phiUnavailable_isNotPersistedAsPass() {
        CertificationItemStatus status = pendingPhiStatus();
        stubSingleSeason();
        when(seasonServiceClient.getActivePHIInternal(100))
                .thenThrow(new IllegalStateException("season-service unavailable"));

        assertThatThrownBy(() -> service.autoPopulateFromFieldLogs(1, List.of(status), List.of(phiItem())))
                .isInstanceOf(AppException.class);
        assertThat(status.getStatus()).isEqualTo("PENDING");
        assertThat(status.getCheckedAt()).isNull();
    }

    @Test
    void verifiedEmptyPhi_isPass() {
        CertificationItemStatus status = pendingPhiStatus();
        stubSingleSeason();
        when(seasonServiceClient.getActivePHIInternal(100)).thenReturn(List.of());

        service.autoPopulateFromFieldLogs(1, List.of(status), List.of(phiItem()));

        assertThat(status.getStatus()).isEqualTo("PASS");
        assertThat(status.getCheckedAt()).isNotNull();
    }

    @Test
    void activePhiViolation_isFail() {
        CertificationItemStatus status = pendingPhiStatus();
        stubSingleSeason();
        when(seasonServiceClient.getActivePHIInternal(100)).thenReturn(List.of(
                SeasonServiceClient.PesticideRecordInternalDto.builder()
                        .id(7)
                        .seasonId(100)
                        .build()));

        service.autoPopulateFromFieldLogs(1, List.of(status), List.of(phiItem()));

        assertThat(status.getStatus()).isEqualTo("FAIL");
        assertThat(status.getNotes()).contains("1 vi phạm PHI");
    }

    @Test
    void verifiedNoSeasons_keepsPhiPending() {
        CertificationItemStatus status = pendingPhiStatus();
        when(plotRepository.findAllByFarm_Id(1)).thenReturn(List.of(Plot.builder().id(10).build()));
        when(seasonServiceClient.getSeasonsByPlotId(10)).thenReturn(List.of());

        service.autoPopulateFromFieldLogs(1, List.of(status), List.of(phiItem()));

        assertThat(status.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void trainingWithoutMembersIsFail() {
        CertificationItemStatus status = pendingTrainingStatus();
        stubSingleSeason();
        when(seasonServiceClient.getTrainingComplianceInternal(100)).thenReturn(trainingSnapshot(0, 0, false));

        service.autoPopulateFromFieldLogs(1, List.of(status), List.of(trainingItem()));

        assertThat(status.getStatus()).isEqualTo("FAIL");
        assertThat(status.getNotes()).contains("Không có nhân sự");
    }

    @Test
    void partialTrainingCoverageIsFail() {
        CertificationItemStatus status = pendingTrainingStatus();
        stubSingleSeason();
        when(seasonServiceClient.getTrainingComplianceInternal(100)).thenReturn(trainingSnapshot(3, 2, false));

        service.autoPopulateFromFieldLogs(1, List.of(status), List.of(trainingItem()));

        assertThat(status.getStatus()).isEqualTo("FAIL");
        assertThat(status.getNotes()).contains("2/3");
    }

    @Test
    void fullTrainingCoverageIsPass() {
        CertificationItemStatus status = pendingTrainingStatus();
        stubSingleSeason();
        when(seasonServiceClient.getTrainingComplianceInternal(100)).thenReturn(trainingSnapshot(3, 3, true));

        service.autoPopulateFromFieldLogs(1, List.of(status), List.of(trainingItem()));

        assertThat(status.getStatus()).isEqualTo("PASS");
        assertThat(status.getNotes()).contains("100%", "3/3");
    }

    @Test
    void trainingEvidenceUnavailableRemainsPendingAndReturnsTypedUnavailable() {
        CertificationItemStatus status = pendingTrainingStatus();
        stubSingleSeason();
        when(seasonServiceClient.getTrainingComplianceInternal(100))
                .thenThrow(new IllegalStateException("season-service unavailable"));

        assertThatThrownBy(() -> service.autoPopulateFromFieldLogs(1, List.of(status), List.of(trainingItem())))
                .isInstanceOfSatisfying(AppException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE));
        assertThat(status.getStatus()).isEqualTo("PENDING");
        assertThat(status.getCheckedAt()).isNull();
    }

    private void stubSingleSeason() {
        when(plotRepository.findAllByFarm_Id(1)).thenReturn(List.of(Plot.builder().id(10).build()));
        when(seasonServiceClient.getSeasonsByPlotId(10)).thenReturn(List.of(
                SeasonServiceClient.SeasonSummaryDto.builder().id(100).plotId(10).build()));
    }

    private CertificationChecklistItem phiItem() {
        return CertificationChecklistItem.builder()
                .id(30)
                .dataSourceType("PHI_CHECK")
                .build();
    }

    private CertificationChecklistItem trainingItem() {
        return CertificationChecklistItem.builder()
                .id(31)
                .dataSourceType("TRAINING_RECORD")
                .build();
    }

    private CertificationItemStatus pendingTrainingStatus() {
        return CertificationItemStatus.builder()
                .id(41)
                .recordId(50)
                .checklistItemId(31)
                .status("PENDING")
                .build();
    }

    private SeasonServiceClient.TrainingComplianceSnapshotDto trainingSnapshot(
            int totalMembers, int compliantMembers, boolean compliant) {
        return SeasonServiceClient.TrainingComplianceSnapshotDto.builder()
                .seasonId(100)
                .totalMembers(totalMembers)
                .compliantMembers(compliantMembers)
                .requiredProgramIds(List.of(1, 2))
                .requiredCategories(List.of("SAFETY", "OPERATIONS"))
                .compliant(compliant)
                .build();
    }

    private CertificationItemStatus pendingPhiStatus() {
        return CertificationItemStatus.builder()
                .id(40)
                .recordId(50)
                .checklistItemId(30)
                .status("PENDING")
                .build();
    }
}
