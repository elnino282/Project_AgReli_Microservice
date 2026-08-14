package org.example.marketplace.client.fallback;

import org.example.marketplace.client.SeasonClient;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SeasonClientFallbackFactoryTest {

    @Test
    void pesticideLookupFailure_isNotConvertedToVerifiedEmpty() {
        SeasonClient fallback = new SeasonClientFallbackFactory()
                .create(new IllegalStateException("season-service unavailable"));

        assertThatThrownBy(() -> fallback.getSeasonPesticideRecords(14))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("season-service");
    }
}
