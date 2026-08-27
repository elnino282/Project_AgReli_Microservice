package org.example.season.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.season.client.SustainabilityServiceClient;
import org.example.season.dto.response.ProductionDiaryEventDto;
import org.example.season.entity.FieldLog;
import org.example.season.entity.Harvest;
import org.example.season.entity.PesticideRecord;
import org.example.season.repository.FieldLogRepository;
import org.example.season.repository.HarvestRepository;
import org.example.season.repository.PesticideRecordRepository;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductionDiaryAggregationService {

    private final FieldLogRepository fieldLogRepository;
    private final PesticideRecordRepository pesticideRecordRepository;
    private final HarvestRepository harvestRepository;
    private final SustainabilityServiceClient sustainabilityServiceClient;

    public List<ProductionDiaryEventDto> getProductionDiary(Integer seasonId) {
        List<ProductionDiaryEventDto> events = new ArrayList<>();

        // 1. Lấy FieldLogs
        List<FieldLog> fieldLogs = fieldLogRepository.findAllBySeasonId(seasonId);
        for (FieldLog log : fieldLogs) {
            events.add(ProductionDiaryEventDto.builder()
                    .eventDate(log.getLogDate())
                    .eventType("FIELD_LOG")
                    .title("Nhật ký đồng ruộng")
                    .description(log.getNotes())
                    .sourceService("season-service")
                    .sourceId(log.getId())
                    .build());
        }

        // 2. Lấy PesticideRecords
        List<PesticideRecord> pesticideRecords = pesticideRecordRepository.findBySeasonId(seasonId);
        for (PesticideRecord rec : pesticideRecords) {
            events.add(ProductionDiaryEventDto.builder()
                    .eventDate(rec.getApplicationDate())
                    .eventType("PESTICIDE")
                    .title("Phun thuốc BVTV: " + rec.getPesticideName())
                    .description("Mục đích: " + rec.getTargetPest() + ". Liều lượng: " + rec.getDosage())
                    .sourceService("season-service")
                    .sourceId(rec.getId())
                    .build());
        }

        // 3. Lấy Harvests
        List<Harvest> harvests = harvestRepository.findAllBySeasonId(seasonId);
        for (Harvest harvest : harvests) {
            events.add(ProductionDiaryEventDto.builder()
                    .eventDate(harvest.getHarvestDate())
                    .eventType("HARVEST")
                    .title("Thu hoạch")
                    .description("Số lượng: " + harvest.getQuantity() + " (Mã Thu Hoạch: " + harvest.getId() + ")")
                    .sourceService("season-service")
                    .sourceId(harvest.getId())
                    .build());
        }

        // 4. Lấy từ sustainability-service
        try {
            List<SustainabilityServiceClient.NutrientInputEventInternalDto> nutrients = sustainabilityServiceClient.getNutrientInputs(seasonId);
            requireCompleteSource(nutrients, "nutrient inputs", seasonId);
            for (var nutrient : nutrients) {
                events.add(ProductionDiaryEventDto.builder()
                        .eventDate(nutrient.getAppliedDate())
                        .eventType("FERTILIZER")
                        .title("Bón phân: " + nutrient.getInputSource())
                        .description("Lượng N(kg): " + nutrient.getNKg())
                        .sourceService("sustainability-service")
                        .sourceId(nutrient.getId())
                        .build());
            }
        } catch (Exception e) {
            throw sourceUnavailable("nutrient inputs", seasonId, e);
        }

        try {
            List<SustainabilityServiceClient.SoilTestInternalDto> soilTests = sustainabilityServiceClient.getSoilTests(seasonId);
            requireCompleteSource(soilTests, "soil tests", seasonId);
            for (var soil : soilTests) {
                events.add(ProductionDiaryEventDto.builder()
                        .eventDate(soil.getSampleDate())
                        .eventType("SOIL_TEST")
                        .title("Kiểm tra đất")
                        .description("Đã đo lường: " + (soil.getMeasured() ? "Có" : "Không"))
                        .sourceService("sustainability-service")
                        .sourceId(soil.getId())
                        .build());
            }
        } catch (Exception e) {
            throw sourceUnavailable("soil tests", seasonId, e);
        }

        try {
            List<SustainabilityServiceClient.IrrigationWaterAnalysisInternalDto> waterAnalyses = sustainabilityServiceClient.getWaterAnalyses(seasonId);
            requireCompleteSource(waterAnalyses, "water analyses", seasonId);
            for (var water : waterAnalyses) {
                events.add(ProductionDiaryEventDto.builder()
                        .eventDate(water.getSampleDate())
                        .eventType("IRRIGATION")
                        .title("Phân tích nước tưới")
                        .description("Đã đo lường: " + (water.getMeasured() ? "Có" : "Không"))
                        .sourceService("sustainability-service")
                        .sourceId(water.getId())
                        .build());
            }
        } catch (Exception e) {
            throw sourceUnavailable("water analyses", seasonId, e);
        }

        // Sắp xếp theo ngày (mới nhất lên đầu hoặc cũ nhất lên đầu tuỳ vào requirements. Sẽ sort mới nhất lên đầu)
        events.sort(Comparator.comparing(ProductionDiaryEventDto::getEventDate, Comparator.nullsLast(Comparator.reverseOrder())));

        return events;
    }

    private void requireCompleteSource(List<?> records, String source, Integer seasonId) {
        if (records == null) {
            throw new IllegalStateException(source + " returned null for season " + seasonId);
        }
    }

    private AppException sourceUnavailable(String source, Integer seasonId, Exception cause) {
        if (cause instanceof AppException appException) {
            return appException;
        }
        log.error("Cannot load {} for production diary of season {}", source, seasonId, cause);
        return new AppException(ErrorCode.PRODUCTION_DIARY_SOURCE_UNAVAILABLE);
    }
}

