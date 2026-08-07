package org.example.season.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.season.enums.TaskStatus;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_id")
    Integer id;

    @Column(name = "user_id", nullable = false)
    Long userId;

    /**
     * Denormalized assignee full name.
     * Set when task is assigned to a user.
     * Eliminates cross-schema JOIN to identity_db.
     */
    @Column(name = "assignee_name")
    String assigneeName;

    /**
     * Denormalized plot name.
     * Set from the season's plot at task creation.
     * Eliminates cross-schema JOIN to farm_db.
     */
    @Column(name = "plot_name")
    String plotName;

    @ManyToOne
    @JoinColumn(name = "season_id")
    Season season;

    @Column(nullable = false)
    String title;

    @Column(columnDefinition = "TEXT")
    String description;

    @Column(name = "planned_date")
    LocalDate plannedDate;

    @Column(name = "due_date")
    LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    TaskStatus status = TaskStatus.PENDING;

    @Column(name = "actual_start_date")
    LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    LocalDate actualEndDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    String notes;

    @Column(name = "plot_id")
    Long plotId;

    @Column(name = "plot_area")
    BigDecimal plotArea;

    @Column(name = "work_team_id")
    Long workTeamId;

    @Column(name = "estimated_days")
    Integer estimatedDays;

    @Column(name = "base_wage")
    BigDecimal baseWage;

    @Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = TaskStatus.PENDING;
        }
    }

    @jakarta.persistence.Transient
    public LocalDate getEstimatedCompletionDate() {
        if (actualStartDate == null || estimatedDays == null) {
            return null;
        }
        return actualStartDate.plusDays(estimatedDays);
    }
}
