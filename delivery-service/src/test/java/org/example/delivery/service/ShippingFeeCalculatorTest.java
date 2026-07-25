package org.example.delivery.service;

import org.example.delivery.dto.request.CalculateShippingRequest;
import org.example.delivery.dto.response.ShippingOption;
import org.example.delivery.entity.DeliveryProvider;
import org.example.delivery.entity.DeliveryRate;
import org.example.delivery.repository.DeliveryProviderRepository;
import org.example.delivery.repository.DeliveryRateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShippingFeeCalculatorTest {

    @Mock
    private DeliveryProviderRepository providerRepository;

    @Mock
    private DeliveryRateRepository rateRepository;

    @InjectMocks
    private ShippingFeeCalculator shippingFeeCalculator;

    private DeliveryProvider ghtk;
    private DeliveryProvider ghn;

    @BeforeEach
    void setUp() {
        ghtk = DeliveryProvider.builder()
                .id(1)
                .code("GHTK")
                .name("Giao hàng tiết kiệm")
                .supportsColdChain(true)
                .supportsSameDay(true)
                .isActive(true)
                .build();

        ghn = DeliveryProvider.builder()
                .id(2)
                .code("GHN")
                .name("Giao hàng nhanh")
                .supportsColdChain(false)
                .supportsSameDay(false)
                .isActive(true)
                .build();
    }

    @Test
    void calculateOptions_noActiveProviders_returnsEmpty() {
        when(providerRepository.findByIsActiveTrue()).thenReturn(Collections.emptyList());

        CalculateShippingRequest req = new CalculateShippingRequest(
                "Lâm Đồng", "Hồ Chí Minh", BigDecimal.valueOf(5), false, false,
                null, null, null, null, false
        );

        List<ShippingOption> options = shippingFeeCalculator.calculateOptions(req);

        assertTrue(options.isEmpty());
    }

    @Test
    void calculateOptions_standardDelivery_calculatesCorrectly() {
        when(providerRepository.findByIsActiveTrue()).thenReturn(List.of(ghtk, ghn));

        DeliveryRate ghtkRate = DeliveryRate.builder()
                .providerId(1)
                .zoneFrom("Lâm Đồng")
                .zoneTo("Hồ Chí Minh")
                .weightMinKg(BigDecimal.ZERO)
                .weightMaxKg(BigDecimal.valueOf(50))
                .baseRateVnd(BigDecimal.valueOf(30000))
                .perKgVnd(BigDecimal.valueOf(5000))
                .estimatedHours(36)
                .isColdChain(false)
                .build();

        DeliveryRate ghnRate = DeliveryRate.builder()
                .providerId(2)
                .zoneFrom("Lâm Đồng")
                .zoneTo("Hồ Chí Minh")
                .weightMinKg(BigDecimal.ZERO)
                .weightMaxKg(BigDecimal.valueOf(50))
                .baseRateVnd(BigDecimal.valueOf(32000))
                .perKgVnd(BigDecimal.valueOf(6000))
                .estimatedHours(36)
                .isColdChain(false)
                .build();

        when(rateRepository.findRate(1, "Lâm Đồng", "Hồ Chí Minh", BigDecimal.valueOf(5), false))
                .thenReturn(Optional.of(ghtkRate));
        when(rateRepository.findRate(2, "Lâm Đồng", "Hồ Chí Minh", BigDecimal.valueOf(5), false))
                .thenReturn(Optional.of(ghnRate));

        CalculateShippingRequest req = new CalculateShippingRequest(
                "Lâm Đồng", "Hồ Chí Minh", BigDecimal.valueOf(5), false, false,
                null, null, null, null, false
        );

        List<ShippingOption> options = shippingFeeCalculator.calculateOptions(req);

        assertEquals(2, options.size());

        // Sorted by fee: GHTK first (30000 + 5 * 5000 = 55000), GHN second (32000 + 5 * 6000 = 62000)
        ShippingOption first = options.get(0);
        assertEquals("Giao hàng tiết kiệm", first.providerName());
        assertEquals("standard", first.type());
        assertEquals(0, BigDecimal.valueOf(55000).compareTo(first.shippingFeeVnd()));

        ShippingOption second = options.get(1);
        assertEquals("Giao hàng nhanh", second.providerName());
        assertEquals("standard", second.type());
        assertEquals(0, BigDecimal.valueOf(62000).compareTo(second.shippingFeeVnd()));
    }

    @Test
    void calculateOptions_requiresColdChain_filtersAndAddsFee() {
        // GHTK supports cold chain, GHN does not
        when(providerRepository.findByIsActiveTrue()).thenReturn(List.of(ghtk, ghn));

        DeliveryRate coldRate = DeliveryRate.builder()
                .providerId(1)
                .zoneFrom("Lâm Đồng")
                .zoneTo("Hồ Chí Minh")
                .weightMinKg(BigDecimal.ZERO)
                .weightMaxKg(BigDecimal.valueOf(50))
                .baseRateVnd(BigDecimal.valueOf(50000))
                .perKgVnd(BigDecimal.valueOf(10000))
                .estimatedHours(12)
                .isColdChain(true)
                .coldChainFeeVnd(BigDecimal.valueOf(30000))
                .build();

        // Should only search rate for GHTK since GHN is filtered out
        when(rateRepository.findRate(1, "Lâm Đồng", "Hồ Chí Minh", BigDecimal.valueOf(5), true))
                .thenReturn(Optional.of(coldRate));

        CalculateShippingRequest req = new CalculateShippingRequest(
                "Lâm Đồng", "Hồ Chí Minh", BigDecimal.valueOf(5), true, false,
                null, null, null, null, false
        );

        List<ShippingOption> options = shippingFeeCalculator.calculateOptions(req);

        assertEquals(1, options.size());
        ShippingOption opt = options.get(0);
        assertEquals("Giao hàng tiết kiệm", opt.providerName());
        // Fee = base (50000) + per_kg (5 * 10000 = 50000) + cold_chain_fee (30000) = 130000
        assertEquals(0, BigDecimal.valueOf(130000).compareTo(opt.shippingFeeVnd()));
        assertTrue(opt.isColdChain());
    }
}
