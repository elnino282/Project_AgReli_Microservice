package org.example.season.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.example.season.entity.Task;
import org.example.season.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends JpaRepository<Task, Integer>,
                org.springframework.data.jpa.repository.JpaSpecificationExecutor<Task> {
        interface TaskStatusCountProjection {
                TaskStatus getStatus();

                Long getTotal();
        }

        List<Task> findByTitleContainingIgnoreCase(String title);

        List<Task> findAllBySeasonId(Integer seasonId);

        List<Task> findAllBySeasonIdAndUserId(Integer seasonId, Long userId);

        Page<Task> findAllByUserId(Long userId, Pageable pageable);

        boolean existsBySeasonId(Integer seasonId);

        @Query("SELECT COUNT(t) > 0 FROM Task t JOIN t.season s WHERE s.plotId = :plotId AND t.status IN :statuses")
        boolean existsBySeasonPlotIdAndStatusIn(
                        @Param("plotId") Integer plotId,
                        @Param("statuses") Iterable<TaskStatus> statuses);

        long countBySeasonIdAndStatusIn(Integer seasonId, List<TaskStatus> statuses);

        long countBySeasonIdAndStatusNot(Integer seasonId, TaskStatus status);

        List<Task> findBySeasonIdAndStatusNot(Integer seasonId, TaskStatus status);

        Page<Task> findByUserId(Long userId, Pageable pageable);

        Page<Task> findByUserIdAndStatus(Long userId, TaskStatus status, Pageable pageable);

        Page<Task> findByUserIdAndSeasonId(Long userId, Integer seasonId, Pageable pageable);

        Page<Task> findByUserIdAndTitleContainingIgnoreCase(Long userId, String title, Pageable pageable);

        Optional<Task> findByIdAndUserId(Integer id, Long userId);

        @Query("SELECT t FROM Task t WHERE t.userId = :userId " +
                        "AND (:status IS NULL OR t.status = :status) " +
                        "AND (:seasonId IS NULL OR t.season.id = :seasonId) " +
                        "AND (:searchQuery IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :searchQuery, '%')))")
        Page<Task> findByUserIdWithFilters(
                        @Param("userId") Long userId,
                        @Param("status") TaskStatus status,
                        @Param("seasonId") Integer seasonId,
                        @Param("searchQuery") String searchQuery,
                        Pageable pageable);

        @Modifying
        @Query("UPDATE Task t SET t.status = :overdueStatus " +
                        "WHERE t.dueDate < :currentDate " +
                        "AND t.status IN :pendingStatuses")
        int updateOverdueTasks(
                        @Param("currentDate") LocalDate currentDate,
                        @Param("overdueStatus") TaskStatus overdueStatus,
                        @Param("pendingStatuses") List<TaskStatus> pendingStatuses);

        @Query("SELECT t FROM Task t WHERE t.userId = :userId AND (t.dueDate = :today OR t.plannedDate = :today) ORDER BY t.dueDate ASC")
        Page<Task> findTodayTasksByUserId(@Param("userId") Long userId, @Param("today") LocalDate today, Pageable pageable);

        @Query("SELECT t FROM Task t WHERE t.userId = :userId " +
                        "AND t.dueDate > :today AND t.dueDate <= :untilDate " +
                        "AND t.status NOT IN :excludedStatuses " +
                        "ORDER BY t.dueDate ASC")
        List<Task> findUpcomingTasksByUserId(
                        @Param("userId") Long userId,
                        @Param("today") LocalDate today,
                        @Param("untilDate") LocalDate untilDate,
                        @Param("excludedStatuses") List<TaskStatus> excludedStatuses);

        @Query("SELECT COUNT(t) FROM Task t WHERE t.userId = :userId " +
                        "AND t.dueDate < :today " +
                        "AND t.status NOT IN :completedStatuses")
        long countOverdueByUserId(@Param("userId") Long userId, @Param("today") LocalDate today,
                        @Param("completedStatuses") List<TaskStatus> completedStatuses);

        @Query("SELECT COUNT(t) FROM Task t WHERE t.season.id = :seasonId " +
                        "AND t.status = 'DONE' " +
                        "AND t.actualEndDate IS NOT NULL " +
                        "AND t.actualEndDate <= t.dueDate")
        long countCompletedOnTimeBySeasonId(@Param("seasonId") Integer seasonId);

        @Query("SELECT COUNT(t) FROM Task t WHERE t.season.id = :seasonId AND t.status = 'DONE'")
        long countCompletedBySeasonId(@Param("seasonId") Integer seasonId);

        @Query("SELECT t.status AS status, COUNT(t) AS total " +
                        "FROM Task t WHERE t.season.id = :seasonId GROUP BY t.status")
        List<TaskStatusCountProjection> countStatusBySeasonId(@Param("seasonId") Integer seasonId);

        boolean existsByIdAndSeasonId(Integer taskId, Integer seasonId);

        Optional<Task> findByIdAndSeasonId(Integer taskId, Integer seasonId);

        @Query("SELECT t FROM Task t WHERE t.userId = :userId OR (t.workTeamId IS NOT NULL AND t.workTeamId IN :teamIds)")
        List<Task> findTasksForEmployee(@Param("userId") Long userId, @Param("teamIds") List<Long> teamIds);

        boolean existsByWorkTeamId(Long workTeamId);

        @Query("SELECT new org.example.season.dto.TeamProgressSummaryResponse(" +
               "t.workTeamId, wt.teamName, t.plotId, COUNT(t), " +
               "SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END), " +
               "SUM(CASE WHEN t.status IN ('IN_PROGRESS', 'PENDING') THEN 1 ELSE 0 END)) " +
               "FROM Task t JOIN WorkTeam wt ON t.workTeamId = wt.id " +
               "WHERE t.season.id = :seasonId AND t.workTeamId IS NOT NULL " +
               "GROUP BY t.workTeamId, wt.teamName, t.plotId")
        List<org.example.season.dto.TeamProgressSummaryResponse> getTeamProgressSummary(@Param("seasonId") Long seasonId);
}
