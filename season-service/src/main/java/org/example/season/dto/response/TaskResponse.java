package org.example.season.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TaskResponse {
    Integer taskId;
    String title;
    String description;
    String status;
    LocalDate plannedDate;
    LocalDate dueDate;
    LocalDate actualStartDate;
    LocalDate actualEndDate;
    String notes;
    Integer seasonId;
    String seasonName;
    Long userId;
    String userName;
    Long plotId;
    Long workTeamId;
    Integer estimatedDays;
    LocalDate estimatedCompletionDate;
    String plotName;
    java.math.BigDecimal plotArea;
    java.math.BigDecimal baseWage;
    LocalDateTime createdAt;
}
