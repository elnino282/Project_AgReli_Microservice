package org.example.cropcatalog.service;

import java.util.List;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.cropcatalog.exception.AppException;
import org.example.cropcatalog.exception.ErrorCode;
import org.example.cropcatalog.dto.request.VarietyRequest;
import org.example.cropcatalog.dto.response.VarietyResponse;
import org.example.cropcatalog.entity.Crop;
import org.example.cropcatalog.entity.Variety;
import org.example.cropcatalog.mapper.VarietyMapper;
import org.example.cropcatalog.repository.CropRepository;
import org.example.cropcatalog.repository.VarietyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.example.cropcatalog.client.SeasonServiceClient;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Transactional
@Slf4j
public class VarietyService {

    final VarietyRepository varietyRepository;
    final CropRepository cropRepository;
    final VarietyMapper varietyMapper;
    final SeasonServiceClient seasonServiceClient;

    public VarietyResponse get(Integer id) {
        Variety variety = varietyRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        return varietyMapper.toResponse(variety);
    }

    public List<VarietyResponse> listByCrop(Integer cropId) {
        Crop crop = cropRepository.findById(cropId)
                .orElseThrow(() -> new AppException(ErrorCode.CROP_NOT_FOUND));
        return varietyRepository.findAllByCrop(crop)
                .stream()
                .map(varietyMapper::toResponse)
                .toList();
    }

    public List<VarietyResponse> getAll() {
        log.info("Fetching all varieties");
        return varietyRepository.findAll()
                .stream()
                .map(varietyMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<VarietyResponse> getByCropId(Integer cropId) {
        return listByCrop(cropId);
    }

    public VarietyResponse create(VarietyRequest request) {
        log.info("Creating variety: name={}, cropId={}", request.getName(), request.getCropId());

        Crop crop = cropRepository.findById(request.getCropId())
                .orElseThrow(() -> new AppException(ErrorCode.CROP_NOT_FOUND));

        Variety variety = varietyMapper.toEntity(request, crop);
        Variety saved = varietyRepository.save(variety);

        log.info("Created variety: id={}", saved.getId());
        return varietyMapper.toResponse(saved);
    }

    public VarietyResponse update(Integer id, VarietyRequest request) {
        log.info("Updating variety: id={}", id);

        Variety variety = varietyRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));

        Crop crop = cropRepository.findById(request.getCropId())
                .orElseThrow(() -> new AppException(ErrorCode.CROP_NOT_FOUND));

        varietyMapper.update(variety, request, crop);
        Variety saved = varietyRepository.save(variety);

        log.info("Updated variety: id={}", saved.getId());
        return varietyMapper.toResponse(saved);
    }

    public void delete(Integer id) {
        log.info("Deleting variety: id={}", id);

        Variety variety = varietyRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));

        final Boolean hasSeasons;
        try {
            hasSeasons = seasonServiceClient.existsByVariety(id);
            if (hasSeasons == null) {
                throw new AppException(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
            }
        } catch (AppException exception) {
            throw exception;
        } catch (Exception e) {
            log.error("Failed to verify whether variety {} is referenced in seasons", id, e);
            throw new AppException(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
        }

        if (Boolean.TRUE.equals(hasSeasons)) {
            log.warn("Cannot delete variety {} - referenced in seasons", id);
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE); // Using existing error code for conflict
        }

        varietyRepository.delete(variety);
        log.info("Deleted variety: id={}", id);
    }
}
