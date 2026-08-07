package org.example.season.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateTaskRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    String title;

    @Size(max = 4000, message = "Description must not exceed 4000 characters")
    String description;

    /**
     * Optional link to a season. If provided, season must belong to current user.
     */
    Integer seasonId;

    /**
     * Optional planned start date for the task.
     */
    LocalDate plannedDate;

    /**
     * Optional due date for the task.
     */
    LocalDate dueDate;

    @Size(max = 4000, message = "Notes must not exceed 4000 characters")
    String notes;

    /**
     * Optional assignee user ID. If omitted, task is assigned to current farmer.
     */
    Long assigneeUserId;

    /**
     * Optional plot/zone ID to assign the task to a specific area.
     */
    Long plotId;

    /**
     * Optional work team ID to assign the task to a team.
     */
    Long workTeamId;

    /**
     * Optional estimated number of days to complete the task.
     */
    Integer estimatedDays;

    /**
     * Optional base wage for the task.
     */
    BigDecimal baseWage;
}
