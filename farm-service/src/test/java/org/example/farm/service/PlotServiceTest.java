package org.example.farm.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.example.farm.client.SeasonServiceClient;
import org.example.farm.config.CurrentUserService;
import org.example.farm.entity.Farm;
import org.example.farm.entity.Plot;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.FarmRepository;
import org.example.farm.repository.OutboxEventRepository;
import org.example.farm.repository.PlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PlotServiceTest {

    private final PlotRepository plotRepository = mock(PlotRepository.class);
    private final OutboxEventRepository outboxRepository = mock(OutboxEventRepository.class);
    private final ObjectMapper objectMapper = mock(ObjectMapper.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final SeasonServiceClient seasonClient = mock(SeasonServiceClient.class);
    private final Plot plot = Plot.builder()
            .id(12)
            .farm(Farm.builder().id(4).userId(9L).name("Alpha").build())
            .plotName("North")
            .build();
    private PlotService service;

    @BeforeEach
    void setUp() throws Exception {
        service = new PlotService(
                plotRepository,
                mock(FarmRepository.class),
                outboxRepository,
                objectMapper,
                currentUserService,
                seasonClient);
        when(currentUserService.getCurrentUserId()).thenReturn(9L);
        when(plotRepository.findByIdAndFarmUserId(12, 9L)).thenReturn(Optional.of(plot));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
    }

    @Test
    void activeSeasonBlocksDelete() {
        when(seasonClient.getPlotDependencies(12)).thenReturn(dependencies(true, false));

        assertGuard(ErrorCode.PLOT_HAS_ACTIVE_SEASONS);
    }

    @Test
    void activeTaskBlocksDelete() {
        when(seasonClient.getPlotDependencies(12)).thenReturn(dependencies(false, true));

        assertGuard(ErrorCode.PLOT_HAS_ACTIVE_TASKS);
    }

    @Test
    void unavailableDependencyBlocksDeleteWithTyped503() {
        when(seasonClient.getPlotDependencies(12)).thenThrow(new IllegalStateException("down"));

        assertGuard(ErrorCode.PLOT_DEPENDENCY_UNAVAILABLE);
    }

    @Test
    void nullDependencyResponseBlocksDeleteWithTyped503() {
        when(seasonClient.getPlotDependencies(12)).thenReturn(null);

        assertGuard(ErrorCode.PLOT_DEPENDENCY_UNAVAILABLE);
    }

    @Test
    void verifiedNoReferencesWritesOutboxAndDeletes() {
        when(seasonClient.getPlotDependencies(12)).thenReturn(dependencies(false, false));

        service.deletePlotForCurrentFarmer(12);

        verify(outboxRepository).save(any());
        verify(plotRepository).delete(plot);
    }

    @Test
    void otherOwnerCannotReachDependencyGuardOrDelete() {
        when(plotRepository.findByIdAndFarmUserId(12, 9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deletePlotForCurrentFarmer(12))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.PLOT_NOT_FOUND);
        verifyNoInteractions(seasonClient);
        verify(plotRepository, never()).delete(any());
    }

    private void assertGuard(ErrorCode expected) {
        assertThatThrownBy(() -> service.deletePlotForCurrentFarmer(12))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(expected);
        verify(outboxRepository, never()).save(any());
        verify(plotRepository, never()).delete(any());
    }

    private SeasonServiceClient.PlotDependencyStatusDto dependencies(boolean seasons, boolean tasks) {
        return SeasonServiceClient.PlotDependencyStatusDto.builder()
                .hasActiveSeasons(seasons)
                .hasActiveTasks(tasks)
                .build();
    }
}
