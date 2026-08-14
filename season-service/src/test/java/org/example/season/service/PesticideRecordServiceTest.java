package org.example.season.service;

import org.example.season.dto.request.CreatePesticideRecordRequest;
import org.example.season.dto.response.PesticideRecordResponse;
import org.example.season.entity.FieldLog;
import org.example.season.entity.PesticidePHIReference;
import org.example.season.entity.PesticideRecord;
import org.example.season.entity.Season;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.example.season.repository.FieldLogRepository;
import org.example.season.repository.PesticidePHIReferenceRepository;
import org.example.season.repository.PesticideRecordRepository;
import org.example.season.repository.SeasonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PesticideRecordServiceTest {

    @Mock
    private PesticideRecordRepository repository;
    @Mock
    private PesticidePHIReferenceRepository referenceRepository;
    @Mock
    private SeasonRepository seasonRepository;
    @Mock
    private SeasonWorkspaceAccessService workspaceAccessService;
    @Mock
    private FieldLogRepository fieldLogRepository;

    private PesticideRecordService service;

    @BeforeEach
    void setUp() {
        service = new PesticideRecordService(
                repository,
                referenceRepository,
                seasonRepository,
                workspaceAccessService,
                fieldLogRepository);
    }

    @Test
    void fieldLogWithUnknownPesticide_rejectsBeforeWritingZeroDayRecord() {
        FieldLog fieldLog = fieldLog(21, "Mystery pesticide applied");
        when(fieldLogRepository.findById(21)).thenReturn(Optional.of(fieldLog));
        when(referenceRepository.findAll()).thenReturn(List.of());
        when(referenceRepository.findByPesticideNameContainingIgnoreCase("Mystery"))
                .thenReturn(Optional.empty());
        when(referenceRepository.findByActiveIngredientContainingIgnoreCase("Mystery"))
                .thenReturn(Optional.empty());
        when(referenceRepository.findByName("Mystery")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createFromFieldLog(21, 7L))
                .isInstanceOfSatisfying(AppException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.PESTICIDE_PHI_NOT_FOUND));

        verify(repository, never()).save(any());
        verify(repository, never()).delete(any());
    }

    @Test
    void fieldLogWithKnownPesticide_usesReferencePhi() {
        FieldLog fieldLog = fieldLog(22, "Phun Roundup đúng liều");
        PesticidePHIReference reference = PesticidePHIReference.builder()
                .pesticideName("Roundup")
                .activeIngredient("Glyphosate")
                .phiDays(14)
                .build();
        when(fieldLogRepository.findById(22)).thenReturn(Optional.of(fieldLog));
        when(referenceRepository.findAll()).thenReturn(List.of(reference));
        when(referenceRepository.findByPesticideNameContainingIgnoreCase("Roundup"))
                .thenReturn(Optional.of(reference));
        when(repository.findByFieldLogId(22)).thenReturn(Optional.empty());
        when(repository.save(any(PesticideRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PesticideRecordResponse response = service.createFromFieldLog(22, 7L);

        assertThat(response.getPhiDays()).isEqualTo(14);
        assertThat(response.getHarvestAllowedDate()).isEqualTo(LocalDate.of(2026, 8, 28));
        assertThat(response.getActiveIngredient()).isEqualTo("Glyphosate");
    }

    @Test
    void directCreateWithUnknownPesticide_returnsTypedBadRequest() {
        Season season = Season.builder().id(3).plotId(4).build();
        CreatePesticideRecordRequest request = new CreatePesticideRecordRequest(
                "Mystery", null, null, LocalDate.of(2026, 8, 14),
                "Phun lá", null, null, null);
        when(seasonRepository.findById(3)).thenReturn(Optional.of(season));
        when(referenceRepository.findByPesticideNameContainingIgnoreCase("Mystery"))
                .thenReturn(Optional.empty());
        when(referenceRepository.findByName("Mystery")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(3, request, 7L))
                .isInstanceOfSatisfying(AppException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.PESTICIDE_PHI_NOT_FOUND));

        verify(repository, never()).save(any());
    }

    private FieldLog fieldLog(Integer id, String notes) {
        Season season = Season.builder().id(3).plotId(4).build();
        return FieldLog.builder()
                .id(id)
                .season(season)
                .logDate(LocalDate.of(2026, 8, 14))
                .logType("SPRAY")
                .notes(notes)
                .build();
    }
}
