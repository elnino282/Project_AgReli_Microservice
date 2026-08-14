package org.example.farm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.farm.config.CurrentUserService;
import org.example.farm.dto.request.PlotRequest;
import org.example.farm.dto.response.PlotResponse;
import org.example.farm.entity.Farm;
import org.example.farm.entity.OutboxEvent;
import org.example.farm.entity.Plot;
import org.example.farm.enums.PlotStatus;
import org.example.farm.event.PlotChangedEvent;
import org.example.farm.event.PlotChangedEvent.Action;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.FarmRepository;
import org.example.farm.repository.OutboxEventRepository;
import org.example.farm.repository.PlotRepository;
import org.springframework.beans.factory.annotation.Value;
import org.example.farm.client.SeasonServiceClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.example.farm.exception.SpatialValidationException;
import org.locationtech.jts.geom.Geometry;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlotService {

    private final PlotRepository plotRepository;
    private final FarmRepository farmRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final CurrentUserService currentUserService;
    private final SeasonServiceClient seasonServiceClient;

    @Transactional(readOnly = true)
    public List<PlotResponse> listPlotsForCurrentFarmer() {
        Long userId = currentUserService.getCurrentUserId();
        List<Plot> plots = plotRepository.findAllByFarmUserId(userId);
        return plots.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public PlotResponse createPlotForCurrentFarmer(PlotRequest request) {
        if (request.getFarmId() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        return createPlotForFarm(request.getFarmId(), request);
    }

    @Transactional(readOnly = true)
    public List<PlotResponse> listPlotsByFarm(Integer farmId) {
        Long userId = currentUserService.getCurrentUserId();

        Farm farm = farmRepository.findByIdAndUserId(farmId, userId)
                .orElseThrow(() -> new AccessDeniedException("Access Denied: You do not own this farm."));

        List<Plot> plots = plotRepository.findAllByFarmUserIdAndFarmId(userId, farm.getId());
        return plots.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public PlotResponse createPlotForFarm(Integer farmId, PlotRequest request) {
        Long userId = currentUserService.getCurrentUserId();

        Farm farm = farmRepository.findByIdAndUserId(farmId, userId)
                .orElseThrow(() -> new AccessDeniedException("Access Denied: You do not own this farm."));

        if (!Boolean.TRUE.equals(farm.getActive())) {
            throw new AppException(ErrorCode.FARM_INACTIVE);
        }

        if (request.getParentPlotId() != null && request.getArea() != null) {
            validateAreaRules(request.getParentPlotId(), null, request.getArea());
        }

        String statusCode = (request.getStatus() != null) ? request.getStatus().getCode() : PlotStatus.IDLE.getCode();

        Plot plot = Plot.builder()
                .farm(farm)
                .createdBy(userId)
                .plotName(request.getPlotName())
                .area(request.getArea())
                .soilType(request.getSoilType())
                .boundaryGeoJson(request.getBoundaryGeoJson())
                .parentPlotId(request.getParentPlotId())
                .polygon(request.getPolygon())
                .status(statusCode)
                .build();

        Plot savedPlot = plotRepository.save(plot);
        writeOutboxEvent(savedPlot, Action.CREATED);
        return toResponse(savedPlot);
    }

    @Transactional(readOnly = true)
    public PlotResponse getPlotForCurrentFarmer(Integer id) {
        Long userId = currentUserService.getCurrentUserId();
        Plot plot = plotRepository.findByIdAndFarmUserId(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PLOT_NOT_FOUND));
        return toResponse(plot);
    }

    @Transactional
    public PlotResponse updatePlotForCurrentFarmer(Integer id, PlotRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        Plot plot = plotRepository.findByIdAndFarmUserId(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PLOT_NOT_FOUND));

        if (request.getParentPlotId() != null && request.getArea() != null) {
            validateAreaRules(request.getParentPlotId(), id, request.getArea());
        }

        if (request.getPlotName() != null) {
            plot.setPlotName(request.getPlotName());
        }
        if (request.getArea() != null) {
            plot.setArea(request.getArea());
        }
        if (request.getSoilType() != null) {
            plot.setSoilType(request.getSoilType());
        }
        if (request.getBoundaryGeoJson() != null) {
            plot.setBoundaryGeoJson(request.getBoundaryGeoJson());
        }
        if (request.getParentPlotId() != null) {
            plot.setParentPlotId(request.getParentPlotId());
        }
        if (request.getPolygon() != null) {
            plot.setPolygon(request.getPolygon());
        }
        if (request.getStatus() != null) {
            plot.setStatus(request.getStatus().getCode());
        }

        Plot savedPlot = plotRepository.save(plot);
        writeOutboxEvent(savedPlot, Action.UPDATED);
        return toResponse(savedPlot);
    }

    private void validateAreaRules(Integer parentId, Integer currentPlotId, java.math.BigDecimal newArea) {
        java.math.BigDecimal parentArea = plotRepository.getPlotArea(parentId);
        if (parentArea == null) {
            throw new SpatialValidationException("Parent plot không tồn tại hoặc không hợp lệ.");
        }

        java.math.BigDecimal existingSubZonesArea = plotRepository.getTotalSubZoneArea(parentId);
        if (existingSubZonesArea == null) existingSubZonesArea = java.math.BigDecimal.ZERO;

        if (currentPlotId != null) {
            java.math.BigDecimal currentSubZoneArea = plotRepository.getPlotArea(currentPlotId);
            if (currentSubZoneArea != null) {
                existingSubZonesArea = existingSubZonesArea.subtract(currentSubZoneArea);
            }
        }

        if (existingSubZonesArea.add(newArea).compareTo(parentArea) > 0) {
            throw new SpatialValidationException("Tổng diện tích vượt quá Plot cha.");
        }
    }

    @Transactional
    public void deletePlotForCurrentFarmer(Integer id) {
        Long userId = currentUserService.getCurrentUserId();
        Plot plot = plotRepository.findByIdAndFarmUserId(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PLOT_NOT_FOUND));

        final SeasonServiceClient.PlotDependencyStatusDto dependencies;
        try {
            dependencies = seasonServiceClient.getPlotDependencies(id);
            if (dependencies == null) {
                throw new AppException(ErrorCode.PLOT_DEPENDENCY_UNAVAILABLE);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to verify dependencies for plot {} via season service", id, e);
            throw new AppException(ErrorCode.PLOT_DEPENDENCY_UNAVAILABLE);
        }

        if (dependencies.isHasActiveSeasons()) {
            throw new AppException(ErrorCode.PLOT_HAS_ACTIVE_SEASONS);
        }
        if (dependencies.isHasActiveTasks()) {
            throw new AppException(ErrorCode.PLOT_HAS_ACTIVE_TASKS);
        }

        writeOutboxEvent(plot, Action.DELETED);
        plotRepository.delete(plot);
    }

    private void writeOutboxEvent(Plot plot, Action action) {
        try {
            PlotChangedEvent eventDto = new PlotChangedEvent(plot, action);
            String jsonPayload = objectMapper.writeValueAsString(eventDto);

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateType("Plot")
                    .aggregateId(String.valueOf(plot.getId()))
                    .eventType(eventDto.getEventType())
                    .payload(jsonPayload)
                    .processed(false)
                    .build();

            outboxEventRepository.save(outboxEvent);
            log.info("Saved outbox event for plot: {} (type: {})", plot.getId(), eventDto.getEventType());
        } catch (Exception e) {
            log.error("Failed to write outbox event for plot: {}", plot.getId(), e);
            throw new RuntimeException("Outbox write failed", e);
        }
    }

    private PlotResponse toResponse(Plot plot) {
        if (plot == null) return null;
        return PlotResponse.builder()
                .id(plot.getId())
                .farmId(plot.getFarm() != null ? plot.getFarm().getId() : null)
                .farmName(plot.getFarm() != null ? plot.getFarm().getName() : null)
                .plotName(plot.getPlotName())
                .area(plot.getArea())
                .soilType(plot.getSoilType())
                .boundaryGeoJson(plot.getBoundaryGeoJson())
                .parentPlotId(plot.getParentPlotId())
                .polygon(plot.getPolygon())
                .status(PlotStatus.fromCode(plot.getStatus()))
                .build();
    }
}
