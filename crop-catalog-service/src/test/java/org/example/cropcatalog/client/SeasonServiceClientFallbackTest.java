package org.example.cropcatalog.client;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.example.cropcatalog.exception.AppException;
import org.example.cropcatalog.exception.ErrorCode;
import org.junit.jupiter.api.Test;

class SeasonServiceClientFallbackTest {

    @Test
    void destructiveGuardFallbackNeverReturnsFalse() {
        SeasonServiceClientFallback fallback = new SeasonServiceClientFallback();

        assertThatThrownBy(() -> fallback.existsByVariety(7))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
    }
}
