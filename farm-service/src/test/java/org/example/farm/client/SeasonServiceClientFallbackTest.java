package org.example.farm.client;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SeasonServiceClientFallbackTest {

    private final SeasonServiceClient fallback = new SeasonServiceClientFallback();

    @Test
    void seasonDiscoveryFailure_isNotConvertedToVerifiedEmpty() {
        assertThatThrownBy(() -> fallback.getSeasonsByPlotId(10))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("season-service");
    }

    @Test
    void phiFailure_isNotConvertedToVerifiedEmpty() {
        assertThatThrownBy(() -> fallback.getActivePHIInternal(20))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("season-service");
    }

    @Test
    void plotDependencyFailure_isNotConvertedToNoReferences() {
        assertThatThrownBy(() -> fallback.getPlotDependencies(30))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("season-service");
    }
}
