package org.example.cropcatalog.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import org.example.cropcatalog.client.SeasonServiceClient;
import org.example.cropcatalog.entity.Crop;
import org.example.cropcatalog.entity.Variety;
import org.example.cropcatalog.exception.AppException;
import org.example.cropcatalog.exception.ErrorCode;
import org.example.cropcatalog.repository.CropRepository;
import org.example.cropcatalog.repository.VarietyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class VarietyDeleteIntegrationTest {

    @Autowired
    private VarietyService varietyService;

    @Autowired
    private CropRepository cropRepository;

    @Autowired
    private VarietyRepository varietyRepository;

    @MockBean
    private SeasonServiceClient seasonServiceClient;

    private Integer varietyId;

    @BeforeEach
    void seedVariety() {
        Crop crop = cropRepository.save(Crop.builder().cropName("Rice").build());
        varietyId = varietyRepository.saveAndFlush(
                Variety.builder().crop(crop).name("Jasmine").build()).getId();
    }

    @Test
    void referencedVarietyRemainsInDatabase() {
        when(seasonServiceClient.existsByVariety(varietyId)).thenReturn(true);

        assertThatThrownBy(() -> varietyService.delete(varietyId))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.DUPLICATE_RESOURCE);

        assertThat(varietyRepository.findById(varietyId)).isPresent();
    }

    @Test
    void unavailableSeasonGuardLeavesVarietyInDatabase() {
        when(seasonServiceClient.existsByVariety(varietyId))
                .thenThrow(new IllegalStateException("season unavailable"));

        assertThatThrownBy(() -> varietyService.delete(varietyId))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);

        assertThat(varietyRepository.findById(varietyId)).isPresent();
    }

    @Test
    void verifiedNoReferenceDeletesVarietyFromDatabase() {
        when(seasonServiceClient.existsByVariety(varietyId)).thenReturn(false);

        varietyService.delete(varietyId);
        varietyRepository.flush();

        assertThat(varietyRepository.findById(varietyId)).isEmpty();
    }
}
