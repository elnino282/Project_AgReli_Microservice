package org.example.cropcatalog.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.example.cropcatalog.client.SeasonServiceClient;
import org.example.cropcatalog.entity.Variety;
import org.example.cropcatalog.exception.AppException;
import org.example.cropcatalog.exception.ErrorCode;
import org.example.cropcatalog.mapper.VarietyMapper;
import org.example.cropcatalog.repository.CropRepository;
import org.example.cropcatalog.repository.VarietyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class VarietyServiceTest {

    private final VarietyRepository varietyRepository = mock(VarietyRepository.class);
    private final SeasonServiceClient seasonServiceClient = mock(SeasonServiceClient.class);
    private final Variety variety = Variety.builder().id(7).name("Jasmine").build();
    private VarietyService service;

    @BeforeEach
    void setUp() {
        service = new VarietyService(
                varietyRepository,
                mock(CropRepository.class),
                mock(VarietyMapper.class),
                seasonServiceClient);
        when(varietyRepository.findById(7)).thenReturn(Optional.of(variety));
    }

    @Test
    void deleteRejectsReferencedVariety() {
        when(seasonServiceClient.existsByVariety(7)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(7))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.DUPLICATE_RESOURCE);
        verify(varietyRepository, never()).delete(variety);
    }

    @Test
    void deleteAllowsOnlyVerifiedNoReference() {
        when(seasonServiceClient.existsByVariety(7)).thenReturn(false);

        service.delete(7);

        verify(varietyRepository).delete(variety);
    }

    @Test
    void deleteFailsClosedWhenSeasonLookupThrows() {
        when(seasonServiceClient.existsByVariety(7)).thenThrow(new IllegalStateException("season unavailable"));

        assertThatThrownBy(() -> service.delete(7))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
        verify(varietyRepository, never()).delete(variety);
    }

    @Test
    void deleteFailsClosedWhenSeasonLookupReturnsNull() {
        when(seasonServiceClient.existsByVariety(7)).thenReturn(null);

        assertThatThrownBy(() -> service.delete(7))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
        verify(varietyRepository, never()).delete(variety);
    }
}
