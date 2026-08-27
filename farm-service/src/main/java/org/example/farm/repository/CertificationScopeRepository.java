package org.example.farm.repository;

import org.example.farm.entity.CertificationScope;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CertificationScopeRepository extends JpaRepository<CertificationScope, Integer> {
    List<CertificationScope> findByRecordIdOrderById(Integer recordId);
    void deleteByRecordId(Integer recordId);
    boolean existsByRecordIdAndPlotIdAndCropId(Integer recordId, Integer plotId, Integer cropId);
}
