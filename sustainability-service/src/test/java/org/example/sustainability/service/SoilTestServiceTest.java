package org.example.sustainability.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.example.sustainability.config.CurrentUserService;
import org.example.sustainability.dto.request.CreateSoilTestRequest;
import org.example.sustainability.dto.response.SoilTestResponse;
import org.example.sustainability.entity.SoilTest;
import org.example.sustainability.enums.NutrientInputSourceType;
import org.example.sustainability.repository.SoilTestRepository;
import org.example.sustainability.snapshot.model.PlotContext;
import org.example.sustainability.snapshot.model.SeasonContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SoilTestServiceTest {

    @Mock private SoilTestRepository soilTestRepository;
    @Mock private FarmerOwnershipService ownershipService;
    @Mock private CurrentUserService currentUserService;
    @Mock private SnapshotQueryService snapshotQueryService;

    private SoilTestService soilTestService;

    @BeforeEach
    void setUp() {
        soilTestService = new SoilTestService(
                soilTestRepository,
                ownershipService,
                currentUserService,
                snapshotQueryService
        );
    }

    @Test
    void create_PersistsMeasuredPhAndElectricalConductivity() {
        SeasonContext season = new SeasonContext(
                10, "Season", 20, 30, 40, LocalDate.of(2026, 4, 20), "ACTIVE",
                BigDecimal.TEN, null, "Rice", null
        );
        PlotContext plot = new PlotContext(20, 30, "Plot A", new BigDecimal("5.0"), null, "ACTIVE");
        when(ownershipService.requireOwnedSeason(10)).thenReturn(season);
        when(ownershipService.requireOwnedPlot(20)).thenReturn(plot);
        when(currentUserService.getCurrentUserId()).thenReturn(2L);
        when(soilTestRepository.save(any(SoilTest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SoilTestResponse response = soilTestService.create(10, CreateSoilTestRequest.builder()
                .plotId(20)
                .sampleDate(LocalDate.of(2026, 4, 5))
                .soilPh(new BigDecimal("6.237"))
                .electricalConductivityDsM(new BigDecimal("0.42126"))
                .mineralNKgPerHa(new BigDecimal("45"))
                .sourceType(NutrientInputSourceType.LAB_MEASURED)
                .build());

        ArgumentCaptor<SoilTest> captor = ArgumentCaptor.forClass(SoilTest.class);
        verify(soilTestRepository).save(captor.capture());
        assertEquals(new BigDecimal("6.24"), captor.getValue().getSoilPh());
        assertEquals(new BigDecimal("0.4213"), captor.getValue().getElectricalConductivityDsM());
        assertEquals(new BigDecimal("6.24"), response.getSoilPh());
        assertEquals(new BigDecimal("0.4213"), response.getElectricalConductivityDsM());
    }

    @Test
    void latestByPlots_ReturnsOnlyNewestPersistedResultForEachOwnedPlot() {
        PlotContext plot1 = new PlotContext(1, 11, "Plot 1", new BigDecimal("5"), null, "ACTIVE");
        PlotContext plot2 = new PlotContext(2, 12, "Plot 2", new BigDecimal("2"), null, "ACTIVE");
        when(currentUserService.getCurrentUserId()).thenReturn(2L);
        when(ownershipService.findPlotsByOwnerId(2L)).thenReturn(List.of(plot1, plot2));

        SoilTest newestPlot1 = soilTest(3, 1, LocalDate.of(2026, 6, 1), "6.40");
        SoilTest olderPlot1 = soilTest(1, 1, LocalDate.of(2026, 4, 1), "6.10");
        SoilTest newestPlot2 = soilTest(2, 2, LocalDate.of(2026, 5, 1), "5.70");
        when(soilTestRepository.findAllByPlotIdInOrderByPlotIdAscSampleDateDescCreatedAtDescIdDesc(List.of(1, 2)))
                .thenReturn(List.of(newestPlot1, olderPlot1, newestPlot2));

        List<SoilTestResponse> result = soilTestService.latestByPlots(List.of(1, 2, 1));

        assertEquals(2, result.size());
        assertEquals(new BigDecimal("6.40"), result.get(0).getSoilPh());
        assertEquals(new BigDecimal("5.70"), result.get(1).getSoilPh());
        verify(ownershipService).findPlotsByOwnerId(2L);
    }

    @Test
    void latestByPlots_OmitsMissingEventualSnapshotWithoutQueryingUnverifiedPlot() {
        PlotContext plot1 = new PlotContext(1, 11, "Plot 1", new BigDecimal("5"), null, "ACTIVE");
        when(currentUserService.getCurrentUserId()).thenReturn(2L);
        when(ownershipService.findPlotsByOwnerId(2L)).thenReturn(List.of(plot1));
        when(soilTestRepository.findAllByPlotIdInOrderByPlotIdAscSampleDateDescCreatedAtDescIdDesc(List.of(1)))
                .thenReturn(List.of(soilTest(3, 1, LocalDate.of(2026, 6, 1), "6.40")));

        List<SoilTestResponse> result = soilTestService.latestByPlots(List.of(1, 2));

        assertEquals(1, result.size());
        assertEquals(1, result.getFirst().getPlotId());
    }

    private SoilTest soilTest(Integer id, Integer plotId, LocalDate sampleDate, String ph) {
        return SoilTest.builder()
                .id(id)
                .seasonId(10)
                .plotId(plotId)
                .sampleDate(sampleDate)
                .soilPh(new BigDecimal(ph))
                .electricalConductivityDsM(new BigDecimal("0.4200"))
                .mineralNKgPerHa(new BigDecimal("45"))
                .measured(true)
                .sourceType(NutrientInputSourceType.LAB_MEASURED)
                .createdAt(LocalDateTime.of(2026, 6, 2, 9, 0))
                .build();
    }
}
