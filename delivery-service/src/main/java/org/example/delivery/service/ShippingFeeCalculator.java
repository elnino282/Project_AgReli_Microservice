package org.example.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.delivery.dto.request.CalculateShippingRequest;
import org.example.delivery.dto.response.ShippingOption;
import org.example.delivery.entity.DeliveryProvider;
import org.example.delivery.entity.DeliveryRate;
import org.example.delivery.repository.DeliveryProviderRepository;
import org.example.delivery.repository.DeliveryRateRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShippingFeeCalculator {

    private final DeliveryProviderRepository providerRepository;
    private final DeliveryRateRepository rateRepository;

    /**
     * Tính phí ship cho 1 đơn hàng.
     * Algorithm: base_rate + (weight - weight_min) * per_kg_rate
     * Cold chain: +cold_chain_fee nếu requires_cold_chain = true
     */
    public List<ShippingOption> calculateOptions(CalculateShippingRequest req) {
        log.info("Calculating shipping options for request: {}", req);
        List<DeliveryProvider> providers = providerRepository.findByIsActiveTrue();

        return providers.stream()
                .filter(p -> {
                    if (req.requiresColdChain() && !Boolean.TRUE.equals(p.getSupportsColdChain())) return false;
                    if (req.prefersSameDay() && !Boolean.TRUE.equals(p.getSupportsSameDay())) return false;
                    return true;
                })
                .flatMap(p -> buildOptionsForProvider(p, req).stream())
                .sorted(Comparator.comparing(ShippingOption::shippingFeeVnd))
                .toList();
    }

    private List<ShippingOption> buildOptionsForProvider(
            DeliveryProvider provider, CalculateShippingRequest req) {
        List<ShippingOption> options = new ArrayList<>();

        // Standard option
        DeliveryRate standardRate = rateRepository.findRate(
                provider.getId(),
                req.senderProvince(),
                req.recipientProvince(),
                req.weightKg(),
                req.requiresColdChain()
        ).orElse(null);

        if (standardRate != null) {
            long fee = calculateFee(standardRate, req);
            options.add(new ShippingOption(
                    "standard",
                    provider.getId(),
                    provider.getName(),
                    BigDecimal.valueOf(fee),
                    standardRate.getEstimatedHours(),
                    false,
                    req.requiresColdChain()
            ));
        }

        // Same-day option (nếu hỗ trợ và trong cùng thành phố)
        if (Boolean.TRUE.equals(provider.getSupportsSameDay()) &&
                req.senderProvince().equalsIgnoreCase(req.recipientProvince())) {

            DeliveryRate sameDayRate = rateRepository.findRate(
                    provider.getId(),
                    req.senderProvince(),
                    req.recipientProvince(),
                    req.weightKg(),
                    req.requiresColdChain()
            ).orElse(null);

            if (sameDayRate != null) {
                long fee = calculateFee(sameDayRate, req);
                // For same day, estimated delivery is fast (e.g. 4 hours for standard, or sameDayRate's estimatedHours if lower)
                int hours = sameDayRate.getEstimatedHours() != null && sameDayRate.getEstimatedHours() < 24 
                        ? sameDayRate.getEstimatedHours() : 4;
                options.add(new ShippingOption(
                        "same_day",
                        provider.getId(),
                        provider.getName(),
                        BigDecimal.valueOf(fee),
                        hours,
                        true,
                        req.requiresColdChain()
                ));
            }
        }

        return options;
    }

    private long calculateFee(DeliveryRate rate, CalculateShippingRequest req) {
        BigDecimal baseFee = rate.getBaseRateVnd();
        
        // Tính khoảng cách nếu có tọa độ
        if (req.senderLat() != null && req.senderLon() != null && req.recipientLat() != null && req.recipientLon() != null) {
            double distanceKm = calculateHaversineDistance(req.senderLat(), req.senderLon(), req.recipientLat(), req.recipientLon());
            // Nếu khoảng cách < 20km (Giao hàng nội ô/cục bộ), áp dụng mức phí đồng giá rẻ (ví dụ 15,000 VND) cho baseFee
            if (distanceKm < 20.0) {
                baseFee = BigDecimal.valueOf(15000);
            }
        }

        BigDecimal extraKg = req.weightKg().subtract(rate.getWeightMinKg());
        if (extraKg.compareTo(BigDecimal.ZERO) < 0) {
            extraKg = BigDecimal.ZERO;
        }

        BigDecimal weightFee = extraKg.multiply(rate.getPerKgVnd());
        BigDecimal coldChainFee = req.requiresColdChain() && rate.getColdChainFeeVnd() != null 
                ? rate.getColdChainFeeVnd() : BigDecimal.ZERO;

        long finalFee = baseFee.add(weightFee).add(coldChainFee).longValue();
        
        // Giảm giá 30% nếu khách hàng chọn giao hàng gom cuối tuần (tiết kiệm)
        if (req.isGroupedDelivery()) {
            finalFee = (long) (finalFee * 0.7);
        }

        return finalFee;
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Bán kính Trái Đất theo km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
