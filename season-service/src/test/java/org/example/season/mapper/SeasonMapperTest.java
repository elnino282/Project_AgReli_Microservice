package org.example.season.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import org.example.season.dto.response.SeasonResponse;
import org.example.season.entity.Season;
import org.example.season.enums.SeasonStatus;
import org.example.season.service.ExternalServiceClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SeasonMapperTest {

    @Mock
    private ExternalServiceClient externalServiceClient;

    private SeasonMapper seasonMapper;

    @BeforeEach
    void setUp() {
        seasonMapper = new SeasonMapper(externalServiceClient);
    }

    @Test
    void toResponse_shouldIncludeLinkedFarmPlotAndCropNames() {
        Season season = Season.builder()
                .id(9)
                .seasonName("Vụ Hè Thu 2026")
                .plotId(12)
                .cropId(3)
                .varietyId(4)
                .startDate(LocalDate.of(2026, 4, 20))
                .status(SeasonStatus.ACTIVE)
                .build();

        when(externalServiceClient.getPlot(12)).thenReturn(ExternalServiceClient.PlotInternalDto.builder()
                .id(12)
                .plotName("Thửa lúa DT8")
                .farmId(7)
                .farmName("Nông trại An Phú")
                .build());
        when(externalServiceClient.getCrop(3)).thenReturn(ExternalServiceClient.CropInternalDto.builder()
                .id(3)
                .cropName("Lúa")
                .build());
        when(externalServiceClient.getVariety(4)).thenReturn(ExternalServiceClient.VarietyInternalDto.builder()
                .id(4)
                .name("Đài Thơm 8")
                .cropId(3)
                .build());

        SeasonResponse response = seasonMapper.toResponse(season);

        assertEquals(7, response.getFarmId());
        assertEquals("Nông trại An Phú", response.getFarmName());
        assertEquals("Thửa lúa DT8", response.getPlotName());
        assertEquals("Lúa", response.getCropName());
        assertEquals("Đài Thơm 8", response.getVarietyName());
    }
}
