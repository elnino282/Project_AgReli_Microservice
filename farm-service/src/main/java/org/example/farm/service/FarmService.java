package org.example.farm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.farm.config.CurrentUserService;
import org.example.farm.dto.common.PageResponse;
import org.example.farm.dto.request.FarmCreateRequest;
import org.example.farm.dto.request.FarmUpdateRequest;
import org.example.farm.dto.response.FarmResponse;
import org.example.farm.entity.Farm;
import org.example.farm.entity.OutboxEvent;
import org.example.farm.entity.Province;
import org.example.farm.entity.Ward;
import org.example.farm.event.FarmChangedEvent;
import org.example.farm.event.FarmChangedEvent.Action;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.FarmRepository;
import org.example.farm.repository.OutboxEventRepository;
import org.example.farm.repository.ProvinceRepository;
import org.example.farm.repository.WardRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FarmService {

    private final FarmRepository farmRepository;
    private final ProvinceRepository provinceRepository;
    private final WardRepository wardRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<FarmResponse> getMyFarms() {
        Long userId = currentUserService.getCurrentUserId();
        List<Farm> farms = farmRepository.findAllByUserId(userId);
        return farms.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FarmResponse getFarmDetail(Integer farmId) {
        Long userId = currentUserService.getCurrentUserId();
        Farm farm = farmRepository.findByIdAndUserId(farmId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN));
        return toResponse(farm);
    }

    @Transactional(readOnly = true)
    public PageResponse<FarmResponse> searchMyFarms(String keyword, Boolean active, int page, int size) {
        Long userId = currentUserService.getCurrentUserId();
        String trimmedKeyword = keyword != null ? keyword.trim() : null;
        if (trimmedKeyword != null && trimmedKeyword.isEmpty()) {
            trimmedKeyword = null;
        }

        Page<Farm> farmsPage = farmRepository.searchByUserIdAndKeywordAndActive(
                userId,
                trimmedKeyword,
                active,
                PageRequest.of(page, size));

        List<FarmResponse> items = farmsPage.getContent()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return PageResponse.of(farmsPage, items);
    }

    @Transactional
    public FarmResponse createFarm(FarmCreateRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        String farmName = request.getFarmName() != null ? request.getFarmName().trim() : null;
        if (farmName == null || farmName.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        if (farmRepository.existsByUserIdAndNameIgnoreCaseAndActiveTrue(userId, farmName)) {
            throw new AppException(ErrorCode.FARM_NAME_EXISTS);
        }

        Province province = provinceRepository.findById(request.getProvinceId())
                .orElseThrow(() -> new AppException(ErrorCode.PROVINCE_NOT_FOUND));

        Ward ward = wardRepository.findById(request.getWardId())
                .orElseThrow(() -> new AppException(ErrorCode.WARD_NOT_FOUND));

        if (ward.getProvince() == null || !ward.getProvince().getId().equals(province.getId())) {
            throw new AppException(ErrorCode.WARD_NOT_IN_PROVINCE);
        }

        Farm farm = Farm.builder()
                .name(farmName)
                .area(request.getArea())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .active(request.getActive() != null ? request.getActive() : Boolean.TRUE)
                .userId(userId)
                .province(province)
                .ward(ward)
                .build();

        Farm savedFarm = farmRepository.save(farm);
        writeOutboxEvent(savedFarm, Action.CREATED);
        return toResponse(savedFarm);
    }

    @Transactional
    public FarmResponse updateFarm(Integer farmId, FarmUpdateRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        Farm farm = farmRepository.findByIdAndUserId(farmId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.FARM_NOT_FOUND));

        if (request.getName() != null) {
            String trimmedName = request.getName().trim();
            if (trimmedName.isEmpty()) {
                throw new AppException(ErrorCode.BAD_REQUEST);
            }
            if (farmRepository.existsByUserIdAndNameIgnoreCaseAndActiveTrueAndIdNot(
                    userId,
                    trimmedName,
                    farm.getId())) {
                throw new AppException(ErrorCode.FARM_NAME_EXISTS);
            }
            farm.setName(trimmedName);
        }

        Province province = farm.getProvince();
        Ward ward = farm.getWard();

        if (request.getProvinceId() != null) {
            province = provinceRepository.findById(request.getProvinceId())
                    .orElseThrow(() -> new AppException(ErrorCode.PROVINCE_NOT_FOUND));
        }

        if (request.getWardId() != null) {
            ward = wardRepository.findById(request.getWardId())
                    .orElseThrow(() -> new AppException(ErrorCode.WARD_NOT_FOUND));
        }

        if (province != null && ward != null && !ward.getProvince().getId().equals(province.getId())) {
            throw new AppException(ErrorCode.WARD_NOT_IN_PROVINCE);
        }

        farm.setProvince(province);
        farm.setWard(ward);

        if (request.getArea() != null) {
            farm.setArea(request.getArea());
        }

        if (request.getLatitude() != null) {
            farm.setLatitude(request.getLatitude());
        }

        if (request.getLongitude() != null) {
            farm.setLongitude(request.getLongitude());
        }

        if (request.getActive() != null) {
            farm.setActive(request.getActive());
        }

        Farm savedFarm = farmRepository.save(farm);
        writeOutboxEvent(savedFarm, Action.UPDATED);
        return toResponse(savedFarm);
    }

    @Transactional
    public void deleteFarm(Integer farmId) {
        Long userId = currentUserService.getCurrentUserId();
        Farm farm = farmRepository.findByIdAndUserId(farmId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.FARM_NOT_FOUND));

        if (Boolean.FALSE.equals(farm.getActive())) {
            throw new AppException(ErrorCode.FARM_ALREADY_INACTIVE);
        }

        if (farmRepository.hasPlots(farmId)) {
            throw new AppException(ErrorCode.FARM_HAS_CHILD_RECORDS);
        }

        farm.setActive(false);
        Farm savedFarm = farmRepository.save(farm);
        writeOutboxEvent(savedFarm, Action.DELETED);
    }

    private void writeOutboxEvent(Farm farm, Action action) {
        try {
            FarmChangedEvent eventDto = new FarmChangedEvent(farm, action);

            String jsonPayload = objectMapper.writeValueAsString(eventDto);

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateType("Farm")
                    .aggregateId(String.valueOf(farm.getId()))
                    .eventType(eventDto.getEventType())
                    .payload(jsonPayload)
                    .processed(false)
                    .build();

            outboxEventRepository.save(outboxEvent);
            log.info("Saved outbox event for farm: {} (type: {})", farm.getId(), eventDto.getEventType());
        } catch (Exception e) {
            log.error("Failed to write outbox event for farm: {}", farm.getId(), e);
            throw new RuntimeException("Outbox write failed", e);
        }
    }

    private FarmResponse toResponse(Farm farm) {
        if (farm == null) return null;
        return FarmResponse.builder()
                .id(farm.getId())
                .farmName(farm.getName())
                .name(farm.getName())
                .ownerUsername(currentUserService.getCurrentUserFullName())
                .provinceId(farm.getProvince() != null ? farm.getProvince().getId() : null)
                .provinceName(farm.getProvince() != null ? farm.getProvince().getName() : null)
                .wardId(farm.getWard() != null ? farm.getWard().getId() : null)
                .wardName(farm.getWard() != null ? farm.getWard().getName() : null)
                .area(farm.getArea())
                .latitude(farm.getLatitude())
                .longitude(farm.getLongitude())
                .active(farm.getActive())
                .userId(farm.getUserId())
                .build();
    }
}
