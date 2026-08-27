package org.example.farm.service;

import org.example.farm.entity.CertificationChecklistItem;
import org.example.farm.entity.CertificationItemStatus;
import org.example.farm.entity.CertificationRecord;
import org.example.farm.entity.CertificationStandard;
import org.example.farm.entity.CertificationScope;
import org.example.farm.entity.Farm;
import org.example.farm.entity.Plot;
import org.example.farm.client.CropCatalogClient;
import org.example.farm.client.SeasonServiceClient;
import org.example.farm.dto.request.UpdateCertificationScopesRequest;
import org.example.farm.repository.CertificationScopeRepository;
import org.example.farm.repository.PlotRepository;
import org.example.farm.repository.CertificationChecklistItemRepository;
import org.example.farm.repository.CertificationItemStatusRepository;
import org.example.farm.repository.CertificationRecordRepository;
import org.example.farm.repository.CertificationStandardRepository;
import org.example.farm.repository.FarmRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(MockitoExtension.class)
class CertificationServiceTest {

    @Mock
    private CertificationStandardRepository standardRepository;
    @Mock
    private CertificationChecklistItemRepository checklistItemRepository;
    @Mock
    private CertificationRecordRepository recordRepository;
    @Mock
    private CertificationItemStatusRepository itemStatusRepository;
    @Mock
    private CertificationScoringService scoringService;
    @Mock
    private FarmRepository farmRepository;
    @Mock
    private CertificationScopeRepository scopeRepository;
    @Mock
    private PlotRepository plotRepository;
    @Mock
    private SeasonServiceClient seasonServiceClient;
    @Mock
    private CropCatalogClient cropCatalogClient;

    @InjectMocks
    private CertificationService service;

    @Test
    void apply_revalidatesAutoEvidenceBeforeUsingPersistedScore() {
        CertificationStandard standard = CertificationStandard.builder()
                .id(2)
                .code("VIETGAP-PLANTING-2026")
                .build();
        CertificationRecord record = CertificationRecord.builder()
                .id(3)
                .farmId(1)
                .standardId(2)
                .status("READY_TO_APPLY")
                .complianceScore(BigDecimal.valueOf(100))
                .build();
        CertificationChecklistItem item = CertificationChecklistItem.builder()
                .id(4)
                .standardId(2)
                .dataSourceType("PHI_CHECK")
                .build();
        CertificationItemStatus status = CertificationItemStatus.builder()
                .recordId(3)
                .checklistItemId(4)
                .status("PASS")
                .build();
        when(farmRepository.findById(1)).thenReturn(Optional.of(Farm.builder().id(1).build()));
        when(standardRepository.findByCode("VIETGAP-PLANTING-2026")).thenReturn(Optional.of(standard));
        when(recordRepository.findByFarmIdAndStandardId(1, 2)).thenReturn(Optional.of(record));
        when(scopeRepository.findByRecordIdOrderById(3)).thenReturn(List.of(
                CertificationScope.builder().recordId(3).seasonId(100).build()));
        when(itemStatusRepository.findByRecordId(3)).thenReturn(List.of(status));
        when(checklistItemRepository.findByStandardId(2)).thenReturn(List.of(item));
        when(scoringService.calculateScore(List.of(status), List.of(item)))
                .thenReturn(BigDecimal.valueOf(100));

        service.apply(1);

        verify(scoringService).autoPopulateFromSeasonIds(List.of(100), List.of(status), List.of(item));
        verify(itemStatusRepository).saveAll(List.of(status));
    }

    @Test
    void apply_rejectsHighScoreWhenMandatoryEvidenceIsNotPassed() {
        CertificationStandard standard = CertificationStandard.builder()
                .id(2)
                .code("VIETGAP-PLANTING-2026")
                .build();
        CertificationRecord record = CertificationRecord.builder()
                .id(3)
                .farmId(1)
                .standardId(2)
                .status("READY_TO_APPLY")
                .complianceScore(BigDecimal.valueOf(95))
                .build();
        CertificationChecklistItem mandatoryItem = CertificationChecklistItem.builder()
                .id(4)
                .standardId(2)
                .isMandatory(true)
                .dataSourceType("MANUAL")
                .build();
        CertificationItemStatus pendingStatus = CertificationItemStatus.builder()
                .recordId(3)
                .checklistItemId(4)
                .status("PENDING")
                .build();
        when(farmRepository.findById(1)).thenReturn(Optional.of(Farm.builder().id(1).build()));
        when(standardRepository.findByCode("VIETGAP-PLANTING-2026")).thenReturn(Optional.of(standard));
        when(recordRepository.findByFarmIdAndStandardId(1, 2)).thenReturn(Optional.of(record));
        when(scopeRepository.findByRecordIdOrderById(3)).thenReturn(List.of(
                CertificationScope.builder().recordId(3).seasonId(100).build()));
        when(itemStatusRepository.findByRecordId(3)).thenReturn(List.of(pendingStatus));
        when(checklistItemRepository.findByStandardId(2)).thenReturn(List.of(mandatoryItem));
        when(scoringService.calculateScore(List.of(pendingStatus), List.of(mandatoryItem)))
                .thenReturn(BigDecimal.valueOf(95));

        assertThrows(IllegalArgumentException.class, () -> service.apply(1));
    }

    @Test
    void getDetails_marksPublishedCertificateForPeriodicReviewWhenDue() {
        CertificationStandard standard = CertificationStandard.builder()
                .id(2)
                .code("VIETGAP-PLANTING-2026")
                .name("VietGAP 2026")
                .build();
        CertificationRecord record = CertificationRecord.builder()
                .id(3)
                .farmId(1)
                .standardId(2)
                .status("PUBLISHED")
                .complianceScore(BigDecimal.valueOf(100))
                .nextPeriodicReviewDate(LocalDate.now().minusDays(1))
                .expiryDate(LocalDate.now().plusMonths(6))
                .build();
        when(farmRepository.findById(1)).thenReturn(Optional.of(Farm.builder().id(1).build()));
        when(standardRepository.findByCode("VIETGAP-PLANTING-2026")).thenReturn(Optional.of(standard));
        when(standardRepository.findById(2)).thenReturn(Optional.of(standard));
        when(recordRepository.findByFarmIdAndStandardId(1, 2)).thenReturn(Optional.of(record));
        when(scopeRepository.findByRecordIdOrderById(3)).thenReturn(List.of(
                CertificationScope.builder().recordId(3).seasonId(100).build()));
        when(itemStatusRepository.findByRecordId(3)).thenReturn(List.of());
        when(checklistItemRepository.findByStandardId(2)).thenReturn(List.of());
        when(scoringService.calculateScore(List.of(), List.of())).thenReturn(BigDecimal.valueOf(100));

        assertEquals("PERIODIC_REVIEW_DUE", service.getCertificationDetails(1).getStatus());
    }

    @Test
    void apply_rejectsFarmWideCertificateWhenNoProductPlotScopeExists() {
        CertificationStandard standard = CertificationStandard.builder().id(2).code("VIETGAP-PLANTING-2026").build();
        CertificationRecord record = CertificationRecord.builder()
                .id(3).farmId(1).standardId(2).status("READY_TO_APPLY")
                .complianceScore(BigDecimal.valueOf(100)).build();
        when(farmRepository.findById(1)).thenReturn(Optional.of(Farm.builder().id(1).build()));
        when(standardRepository.findByCode("VIETGAP-PLANTING-2026")).thenReturn(Optional.of(standard));
        when(recordRepository.findByFarmIdAndStandardId(1, 2)).thenReturn(Optional.of(record));
        when(scopeRepository.findByRecordIdOrderById(3)).thenReturn(List.of());

        assertThrows(IllegalArgumentException.class, () -> service.apply(1));
    }

    @Test
    void updateScopes_rejectsSeasonWhosePlotBelongsToAnotherFarm() {
        CertificationStandard standard = CertificationStandard.builder().id(2).code("VIETGAP-PLANTING-2026").build();
        CertificationRecord record = CertificationRecord.builder()
                .id(3).farmId(1).standardId(2).status("IN_PROGRESS")
                .complianceScore(BigDecimal.ZERO).build();
        when(farmRepository.findById(1)).thenReturn(Optional.of(Farm.builder().id(1).build()));
        when(standardRepository.findByCode("VIETGAP-PLANTING-2026")).thenReturn(Optional.of(standard));
        when(recordRepository.findByFarmIdAndStandardId(1, 2)).thenReturn(Optional.of(record));
        when(seasonServiceClient.getSeasonInternal(100)).thenReturn(SeasonServiceClient.SeasonInternalDto.builder()
                .id(100).plotId(9).cropId(4).build());
        when(plotRepository.findById(9)).thenReturn(Optional.of(Plot.builder()
                .id(9).farm(Farm.builder().id(2).build()).area(BigDecimal.valueOf(5)).build()));
        UpdateCertificationScopesRequest request = UpdateCertificationScopesRequest.builder()
                .scopes(List.of(UpdateCertificationScopesRequest.ScopeItem.builder()
                        .seasonId(100).registeredAreaHa(BigDecimal.ONE).build()))
                .build();

        assertThrows(IllegalArgumentException.class, () -> service.updateScopes(1, request));
    }
}
