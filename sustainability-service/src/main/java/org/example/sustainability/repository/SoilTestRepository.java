package org.example.sustainability.repository;

import java.util.Collection;
import java.util.List;
import org.example.sustainability.entity.SoilTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SoilTestRepository extends JpaRepository<SoilTest, Integer> {

    List<SoilTest> findAllBySeasonIdOrderBySampleDateDescCreatedAtDesc(Integer seasonId);

    List<SoilTest> findAllBySeasonIdAndPlotIdOrderBySampleDateDescCreatedAtDesc(Integer seasonId, Integer plotId);

    List<SoilTest> findAllBySeasonIdAndPlotId(Integer seasonId, Integer plotId);

    List<SoilTest> findAllByPlotIdInOrderByPlotIdAscSampleDateDescCreatedAtDescIdDesc(
            Collection<Integer> plotIds
    );

    boolean existsByLegacyEventId(Integer legacyEventId);
}
