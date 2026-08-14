package org.example.farm.service;

import org.example.farm.entity.CertificationChecklistItem;
import org.example.farm.entity.CertificationItemStatus;
import org.example.farm.entity.CertificationRecord;
import org.example.farm.entity.CertificationStandard;
import org.example.farm.entity.Farm;
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
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

    @InjectMocks
    private CertificationService service;

    @Test
    void apply_revalidatesAutoEvidenceBeforeUsingPersistedScore() {
        CertificationStandard standard = CertificationStandard.builder()
                .id(2)
                .code("VIETGAP-PLANTING-2024")
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
        when(standardRepository.findByCode("VIETGAP-PLANTING-2024")).thenReturn(Optional.of(standard));
        when(recordRepository.findByFarmIdAndStandardId(1, 2)).thenReturn(Optional.of(record));
        when(itemStatusRepository.findByRecordId(3)).thenReturn(List.of(status));
        when(checklistItemRepository.findByStandardId(2)).thenReturn(List.of(item));
        when(scoringService.calculateScore(List.of(status), List.of(item)))
                .thenReturn(BigDecimal.valueOf(100));

        service.apply(1);

        verify(scoringService).autoPopulateFromFieldLogs(1, List.of(status), List.of(item));
        verify(itemStatusRepository).saveAll(List.of(status));
    }
}
