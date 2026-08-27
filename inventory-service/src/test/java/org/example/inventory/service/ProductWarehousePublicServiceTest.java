package org.example.inventory.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.example.inventory.config.CurrentUserService;
import org.example.inventory.dto.response.ProductWarehouseLotResponse;
import org.example.inventory.entity.ProductWarehouseLot;
import org.example.inventory.enums.ProductWarehouseLotStatus;
import org.example.inventory.event.DomainEventPublisher;
import org.example.inventory.repository.ProductWarehouseLotRepository;
import org.example.inventory.repository.ProductWarehouseTransactionRepository;
import org.example.inventory.repository.StockLocationRepository;
import org.example.inventory.repository.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProductWarehousePublicServiceTest {

    @Mock
    ProductWarehouseLotRepository productWarehouseLotRepository;

    @Mock
    ProductWarehouseTransactionRepository productWarehouseTransactionRepository;

    @Mock
    WarehouseRepository warehouseRepository;

    @Mock
    StockLocationRepository stockLocationRepository;

    @Mock
    CurrentUserService currentUserService;

    @Mock
    DomainEventPublisher domainEventPublisher;

    ProductWarehousePublicService service;

    @BeforeEach
    void setUp() {
        service = new ProductWarehousePublicService(
                productWarehouseLotRepository,
                productWarehouseTransactionRepository,
                warehouseRepository,
                stockLocationRepository,
                currentUserService,
                new ObjectMapper(),
                domainEventPublisher);
    }

    @Test
    void lotDetailKeepsPackagingAndTraceabilitySnapshotFields() {
        ProductWarehouseLot lot = ProductWarehouseLot.builder()
                .id(1)
                .lotCode("LOT-001")
                .productName("Gạo Đài Thơm 8")
                .seasonId(11)
                .farmId(22)
                .plotId(33)
                .warehouseId(44)
                .harvestedAt(LocalDate.of(2026, 8, 20))
                .receivedAt(LocalDateTime.of(2026, 8, 21, 9, 0))
                .unit("KG")
                .initialQuantity(new BigDecimal("34500"))
                .onHandQuantity(new BigDecimal("32500"))
                .status(ProductWarehouseLotStatus.IN_STOCK)
                .packagingType("BAG")
                .packagingCount(690)
                .processingType("DRIED")
                .traceabilityData("""
                        {"seasonName":"Vụ Hè Thu 2026","farmName":"HTX Xanh","plotName":"Lô A1"}
                        """)
                .build();
        when(productWarehouseLotRepository.findById(1)).thenReturn(Optional.of(lot));
        when(warehouseRepository.findById(44)).thenReturn(Optional.empty());

        ProductWarehouseLotResponse response = service.getLotDetail(1);

        assertEquals("BAG", response.getPackagingType());
        assertEquals(690, response.getPackagingCount());
        assertEquals("DRIED", response.getProcessingType());
        assertEquals("Vụ Hè Thu 2026", response.getSeasonName());
        assertEquals("HTX Xanh", response.getFarmName());
        assertEquals("Lô A1", response.getPlotName());
    }
}
