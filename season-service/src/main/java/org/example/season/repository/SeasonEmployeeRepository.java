package org.example.season.repository;

import java.util.List;
import java.util.Optional;
import org.example.season.entity.SeasonEmployee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SeasonEmployeeRepository extends JpaRepository<SeasonEmployee, Integer> {

    Optional<SeasonEmployee> findBySeasonIdAndEmployeeUserId(Integer seasonId, Long employeeUserId);

    boolean existsBySeasonIdAndEmployeeUserId(Integer seasonId, Long employeeUserId);

    List<SeasonEmployee> findAllBySeasonIdAndActiveTrue(Integer seasonId);

    List<SeasonEmployee> findAllByEmployeeUserIdAndActiveTrue(Long employeeUserId);

    @Query(value = """
            SELECT se FROM SeasonEmployee se
            WHERE se.season.id = :seasonId
            AND (:keyword IS NULL OR :keyword = ''
            OR LOWER(se.employeeUsername) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(se.employeeFullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(se.employeeEmail) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """,
            countQuery = """
            SELECT COUNT(se) FROM SeasonEmployee se
            WHERE se.season.id = :seasonId
            AND (:keyword IS NULL OR :keyword = ''
            OR LOWER(se.employeeUsername) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(se.employeeFullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(se.employeeEmail) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<SeasonEmployee> searchBySeasonAndKeyword(@Param("seasonId") Integer seasonId,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("SELECT se FROM SeasonEmployee se WHERE se.season.id = :seasonId AND se.active = true ORDER BY se.isTrained DESC, se.employeeFullName ASC")
    List<SeasonEmployee> findEligibleAssigneesBySeasonId(@Param("seasonId") Integer seasonId);

    @Query("SELECT se FROM SeasonEmployee se WHERE se.season.id = :seasonId AND se.active = true AND se.employeeUserId IN :userIds ORDER BY se.isTrained DESC, se.employeeFullName ASC")
    List<SeasonEmployee> findEligibleAssigneesBySeasonIdAndUserIds(@Param("seasonId") Integer seasonId, @Param("userIds") List<Long> userIds);
}
