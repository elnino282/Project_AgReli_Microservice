package org.example.season.service;

import lombok.RequiredArgsConstructor;
import org.example.season.entity.WorkTeam;
import org.example.season.entity.WorkTeamMember;
import org.example.season.enums.TeamRole;
import org.example.season.repository.TaskRepository;
import org.example.season.repository.WorkTeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamManagementService {

    private final WorkTeamRepository workTeamRepository;
    private final TaskRepository taskRepository;

    @Transactional
    public WorkTeam createWorkTeam(Long seasonId, String teamName, Long leaderId, List<Long> memberIds) {
        WorkTeam team = WorkTeam.builder()
                .seasonId(seasonId)
                .teamName(teamName)
                .teamLeaderUserId(leaderId)
                .build();

        List<WorkTeamMember> members = memberIds.stream()
                .distinct()
                .map(memberId -> WorkTeamMember.builder()
                        .workTeam(team)
                        .employeeUserId(memberId)
                        .role((leaderId != null && memberId.equals(leaderId)) ? TeamRole.LEADER : TeamRole.MEMBER)
                        .build())
                .collect(Collectors.toList());

        team.setMembers(members);
        return workTeamRepository.save(team);
    }

    @Transactional(readOnly = true)
    public List<WorkTeam> getWorkTeamsBySeason(Long seasonId) {
        return workTeamRepository.findBySeasonId(seasonId);
    }

    @Transactional
    public WorkTeam updateWorkTeam(Long seasonId, Long teamId, String teamName, Long leaderId, List<Long> memberIds) {
        WorkTeam team = workTeamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        if (!team.getSeasonId().equals(seasonId)) {
            throw new IllegalArgumentException("Team does not belong to the specified season");
        }

        team.setTeamName(teamName);
        team.setTeamLeaderUserId(leaderId);

        team.getMembers().clear();
        
        List<WorkTeamMember> newMembers = memberIds.stream()
                .distinct()
                .map(memberId -> WorkTeamMember.builder()
                        .workTeam(team)
                        .employeeUserId(memberId)
                        .role((leaderId != null && memberId.equals(leaderId)) ? TeamRole.LEADER : TeamRole.MEMBER)
                        .build())
                .collect(Collectors.toList());
                
        team.getMembers().addAll(newMembers);

        return workTeamRepository.save(team);
    }

    @Transactional
    public void deleteWorkTeam(Long seasonId, Long teamId) {
        WorkTeam team = workTeamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        if (!team.getSeasonId().equals(seasonId)) {
            throw new IllegalArgumentException("Team does not belong to the specified season");
        }

        if (taskRepository.existsByWorkTeamId(teamId)) {
            throw new IllegalArgumentException("Không thể xóa đội nhóm vì đã được phân công công việc");
        }

        workTeamRepository.delete(team);
    }
}
