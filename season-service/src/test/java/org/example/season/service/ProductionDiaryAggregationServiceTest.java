package org.example.season.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.List;
import org.example.season.client.SustainabilityServiceClient;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.example.season.repository.FieldLogRepository;
import org.example.season.repository.HarvestRepository;
import org.example.season.repository.PesticideRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProductionDiaryAggregationServiceTest {

    @Mock
    FieldLogRepository fieldLogRepository;
    @Mock
    PesticideRecordRepository pesticideRecordRepository;
    @Mock
    HarvestRepository harvestRepository;
    @Mock
    SustainabilityServiceClient sustainabilityServiceClient;

    @InjectMocks
    ProductionDiaryAggregationService productionDiaryAggregationService;

    @BeforeEach
    void setUpLocalSources() {
        when(fieldLogRepository.findAllBySeasonId(1)).thenReturn(List.of());
        when(pesticideRecordRepository.findBySeasonId(1)).thenReturn(List.of());
        when(harvestRepository.findAllBySeasonId(1)).thenReturn(List.of());
    }

    @Test
    void downstreamFailureReturnsTypedUnavailableInsteadOfPartialDiary() {
        when(sustainabilityServiceClient.getNutrientInputs(1))
                .thenThrow(new IllegalStateException("sustainability unavailable"));

        assertThatThrownBy(() -> productionDiaryAggregationService.getProductionDiary(1))
                .isInstanceOfSatisfying(AppException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.PRODUCTION_DIARY_SOURCE_UNAVAILABLE));
    }

    @Test
    void verifiedEmptyDownstreamSourcesProduceVerifiedEmptyDiary() {
        when(sustainabilityServiceClient.getNutrientInputs(1)).thenReturn(List.of());
        when(sustainabilityServiceClient.getSoilTests(1)).thenReturn(List.of());
        when(sustainabilityServiceClient.getWaterAnalyses(1)).thenReturn(List.of());

        assertThat(productionDiaryAggregationService.getProductionDiary(1)).isEmpty();
    }
}
