package org.example.season.controller;

import lombok.RequiredArgsConstructor;
import org.example.season.service.TaskAssignmentService;
import org.example.season.service.TeamManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/farmer")
@RequiredArgsConstructor
public class FarmerTeamController {

    private final TeamManagementService teamManagementService;
    private final TaskAssignmentService taskAssignmentService;

    @PostMapping("/seasons/{seasonId}/teams")
    public ResponseEntity<?> createTeam(@PathVariable Long seasonId, 
                                        @RequestParam String teamName,
                                        @RequestParam(required = false) Long leaderId,
                                        @RequestBody List<Long> memberIds) {
        return ResponseEntity.ok(teamManagementService.createWorkTeam(seasonId, teamName, leaderId, memberIds));
    }

    @PutMapping("/seasons/{seasonId}/teams/{teamId}")
    public ResponseEntity<?> updateTeam(@PathVariable Long seasonId,
                                        @PathVariable Long teamId,
                                        @RequestParam String teamName,
                                        @RequestParam(required = false) Long leaderId,
                                        @RequestBody List<Long> memberIds) {
        return ResponseEntity.ok(teamManagementService.updateWorkTeam(seasonId, teamId, teamName, leaderId, memberIds));
    }

    @DeleteMapping("/seasons/{seasonId}/teams/{teamId}")
    public ResponseEntity<?> deleteTeam(@PathVariable Long seasonId, @PathVariable Long teamId) {
        teamManagementService.deleteWorkTeam(seasonId, teamId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/seasons/{seasonId}/teams")
    public ResponseEntity<?> getTeamsBySeason(@PathVariable Long seasonId) {
        return ResponseEntity.ok(teamManagementService.getWorkTeamsBySeason(seasonId));
    }

    @PutMapping("/tasks/{taskId}/assign")
    public ResponseEntity<?> assignTask(@PathVariable Integer taskId, 
                                        @RequestParam Long workTeamId, 
                                        @RequestParam Long plotId) {
        return ResponseEntity.ok(taskAssignmentService.assignTaskToTeamAndPlot(taskId, workTeamId, plotId));
    }

    @GetMapping("/dashboard/team-progress")
    public ResponseEntity<List<org.example.season.dto.TeamProgressSummaryResponse>> getTeamProgressSummary(
            @RequestParam Long seasonId) {
        return ResponseEntity.ok(taskAssignmentService.getTeamProgressSummary(seasonId));
    }
}
