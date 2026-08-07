package org.example.season.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.season.enums.TaskStatus;
import org.example.season.dto.request.TaskRequest;
import org.example.season.dto.response.TaskResponse;
import org.example.season.entity.Season;
import org.example.season.entity.Task;
import org.example.season.repository.SeasonRepository;
import org.example.season.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;
    private final ExternalServiceClient externalServiceClient;
    private final SeasonRepository seasonRepository;

    public TaskResponse create(TaskRequest request) {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User ID is required");
        }
        ExternalServiceClient.UserInternalDto user = externalServiceClient.getUser(request.getUserId());
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }
        Season season = null;
        if (request.getSeasonId() != null) {
            season = seasonRepository.findById(request.getSeasonId()).orElse(null);
        }

        // Populate denormalized fields for DashboardTaskView (avoids cross-schema JOINs)
        String plotName = null;
        if (season != null && season.getPlotId() != null) {
            try {
                plotName = externalServiceClient.getPlot(season.getPlotId()).getPlotName();
            } catch (Exception ignored) {
            }
        }

        Task task = Task.builder()
                .userId(request.getUserId())
                .assigneeName(user.getFullName())
                .plotName(plotName)
                .season(season)
                .title(request.getTitle())
                .description(request.getDescription())
                .plannedDate(request.getPlannedDate())
                .dueDate(request.getDueDate())
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.PENDING)
                .build();
        task = taskRepository.save(task);
        return toResponse(task);
    }

    public List<TaskResponse> getAll() {
        return taskRepository.findAll().stream().map(this::toResponse).toList();
    }

    public TaskResponse update(Integer id, TaskRequest request) {
        Task task = taskRepository.findById(id).orElseThrow();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPlannedDate(request.getPlannedDate());
        task.setDueDate(request.getDueDate());
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        return toResponse(taskRepository.save(task));
    }

    public void delete(Integer id) {
        taskRepository.deleteById(id);
    }

    private TaskResponse toResponse(Task task) {
        String userName = null;
        if (task.getUserId() != null) {
            ExternalServiceClient.UserInternalDto user = externalServiceClient.getUser(task.getUserId());
            if (user != null) {
                userName = user.getUsername();
            }
        }
        return TaskResponse.builder()
                .taskId(task.getId())
                .userName(userName)
                .seasonId(task.getSeason() != null ? task.getSeason().getId() : null)
                .seasonName(task.getSeason() != null ? task.getSeason().getSeasonName() : null)
                .title(task.getTitle())
                .description(task.getDescription())
                .plannedDate(task.getPlannedDate())
                .dueDate(task.getDueDate())
                .status(task.getStatus() != null ? task.getStatus().getCode() : null)
                .actualStartDate(task.getActualStartDate())
                .actualEndDate(task.getActualEndDate())
                .notes(task.getNotes())
                .userId(task.getUserId())
                .baseWage(task.getBaseWage())
                .createdAt(task.getCreatedAt())
                .build();
    }
}
