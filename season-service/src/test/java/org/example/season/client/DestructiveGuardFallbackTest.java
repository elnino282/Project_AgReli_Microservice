package org.example.season.client;

import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DestructiveGuardFallbackTest {

    @Test
    void expenseExistenceFallbackFailsClosed() {
        AppException exception = assertThrows(AppException.class,
                () -> new MonolithServiceClientFallback().existsExpenseBySeasonId(10));

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
    }

    @Test
    void inventoryLotExistenceFallbackFailsClosed() {
        AppException exception = assertThrows(AppException.class,
                () -> new InventoryServiceClientFallback().existsProductWarehouseLotByHarvestId(20));

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
    }
}
