package org.example.season.service;

import lombok.RequiredArgsConstructor;
import org.example.season.dto.request.EmployeeTrainingRecordRequest;
import org.example.season.dto.request.TrainingProgramRequest;
import org.example.season.dto.response.EmployeeTrainingRecordDto;
import org.example.season.dto.response.TrainingProgramDto;
import org.example.season.dto.response.TrainingComplianceSnapshotDto;
import org.example.season.entity.EmployeeTrainingRecord;
import org.example.season.entity.TrainingProgram;
import org.example.season.entity.WorkTeamMember;
import org.example.season.repository.EmployeeTrainingRecordRepository;
import org.example.season.repository.SeasonEmployeeRepository;
import org.example.season.repository.TrainingProgramRepository;
import org.example.season.repository.WorkTeamMemberRepository;
import org.example.season.repository.WorkTeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeTrainingService {

    private final TrainingProgramRepository trainingProgramRepository;
    private final EmployeeTrainingRecordRepository employeeTrainingRecordRepository;
    private final SeasonEmployeeRepository seasonEmployeeRepository;
    private final WorkTeamRepository workTeamRepository;
    private final WorkTeamMemberRepository workTeamMemberRepository;

    @Transactional
    public TrainingProgramDto createTrainingProgram(TrainingProgramRequest req) {
        TrainingProgram program = TrainingProgram.builder()
                .title(req.getTitle())
                .category(req.getCategory())
                .description(req.getDescription())
                .isMandatory(req.getIsMandatory() != null ? req.getIsMandatory() : false)
                .build();
        program = trainingProgramRepository.save(program);
        return toDto(program);
    }

    public List<TrainingProgramDto> getTrainingPrograms(String category) {
        List<TrainingProgram> programs;
        if (category != null && !category.isBlank()) {
            programs = trainingProgramRepository.findByCategory(category);
        } else {
            programs = trainingProgramRepository.findAll();
        }
        return programs.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public EmployeeTrainingRecordDto recordTraining(Long userId, EmployeeTrainingRecordRequest req) {
        TrainingProgram program = trainingProgramRepository.findById(req.getTrainingProgramId())
                .orElseThrow(() -> new IllegalArgumentException("Training program not found"));

        EmployeeTrainingRecord record = EmployeeTrainingRecord.builder()
                .userId(userId)
                .workTeamId(req.getWorkTeamId())
                .trainingProgram(program)
                .trainedAt(req.getTrainedAt())
                .trainerName(req.getTrainerName())
                .evidenceUrls(req.getEvidenceUrls())
                .certifiedUntil(req.getCertifiedUntil())
                .build();
        record = employeeTrainingRecordRepository.save(record);
        return toDto(record);
    }

    public List<EmployeeTrainingRecordDto> getTrainingRecordsForUser(Long userId) {
        return employeeTrainingRecordRepository.findByUserId(userId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * Trả về tình trạng đào tạo của tất cả thành viên trong một mùa vụ (theo seasonId).
     * Dành cho API nội bộ hoặc Farmer kiểm tra.
     */
    public Map<Long, List<EmployeeTrainingRecordDto>> getTrainingStatusForSeason(Integer seasonId) {
        // 1. Tìm các WorkTeam thuộc seasonId
        var teams = workTeamRepository.findBySeasonId(Long.valueOf(seasonId));
        if (teams.isEmpty()) {
            return new HashMap<>();
        }

        // 2. Tìm tất cả userId trong các đội này
        List<Long> teamIds = teams.stream().map(t -> t.getId()).toList();
        List<WorkTeamMember> members = workTeamMemberRepository.findByWorkTeamIdIn(teamIds);
        List<Long> userIds = members.stream().map(WorkTeamMember::getEmployeeUserId).distinct().toList();

        if (userIds.isEmpty()) {
            return new HashMap<>();
        }

        // 3. Lấy tất cả records của các userId này
        List<EmployeeTrainingRecord> records = employeeTrainingRecordRepository.findByUserIdIn(userIds);

        // 4. Nhóm theo userId
        Map<Long, List<EmployeeTrainingRecordDto>> result = new HashMap<>();
        for (Long uid : userIds) {
            result.put(uid, records.stream()
                    .filter(r -> r.getUserId().equals(uid))
                    .map(this::toDto)
                    .toList());
        }
        return result;
    }

    /**
     * Snapshot fail-closed used by VietGAP certification scoring. A member is compliant only
     * when every mandatory program has a completed, in-date record with evidence.
     */
    public TrainingComplianceSnapshotDto getTrainingComplianceForSeason(Integer seasonId) {
        var memberUserIds = new LinkedHashSet<Long>();
        seasonEmployeeRepository.findAllBySeasonIdAndActiveTrue(seasonId).stream()
                .map(seasonEmployee -> seasonEmployee.getEmployeeUserId())
                .filter(java.util.Objects::nonNull)
                .forEach(memberUserIds::add);

        var teams = workTeamRepository.findBySeasonId(Long.valueOf(seasonId));
        List<Long> teamIds = teams.stream().map(team -> team.getId()).toList();
        if (!teamIds.isEmpty()) {
            workTeamMemberRepository.findByWorkTeamIdIn(teamIds).stream()
                    .map(WorkTeamMember::getEmployeeUserId)
                    .filter(java.util.Objects::nonNull)
                    .forEach(memberUserIds::add);
        }
        List<Long> userIds = List.copyOf(memberUserIds);
        List<TrainingProgram> requiredPrograms = trainingProgramRepository.findByIsMandatoryTrue();
        List<EmployeeTrainingRecord> records = userIds.isEmpty()
                ? List.of()
                : employeeTrainingRecordRepository.findByUserIdIn(userIds);
        LocalDate today = LocalDate.now();
        Map<Long, Boolean> memberCompliance = new LinkedHashMap<>();

        for (Long userId : userIds) {
            boolean memberIsCompliant = !requiredPrograms.isEmpty()
                    && requiredPrograms.stream().allMatch(program -> records.stream()
                            .anyMatch(record -> isValidRecord(record, userId, program.getId(), today)));
            memberCompliance.put(userId, memberIsCompliant);
        }

        int compliantMembers = (int) memberCompliance.values().stream().filter(Boolean.TRUE::equals).count();
        boolean compliant = !memberCompliance.isEmpty()
                && !requiredPrograms.isEmpty()
                && compliantMembers == memberCompliance.size();

        return TrainingComplianceSnapshotDto.builder()
                .seasonId(seasonId)
                .totalMembers(memberCompliance.size())
                .compliantMembers(compliantMembers)
                .requiredProgramIds(requiredPrograms.stream().map(TrainingProgram::getId).toList())
                .requiredCategories(requiredPrograms.stream()
                        .map(TrainingProgram::getCategory)
                        .filter(category -> category != null && !category.isBlank())
                        .distinct()
                        .toList())
                .memberCompliance(memberCompliance)
                .compliant(compliant)
                .build();
    }

    private boolean isValidRecord(EmployeeTrainingRecord record, Long userId, Integer programId, LocalDate today) {
        if (!userId.equals(record.getUserId())
                || record.getTrainingProgram() == null
                || !programId.equals(record.getTrainingProgram().getId())
                || !"COMPLETED".equalsIgnoreCase(record.getStatus())
                || record.getTrainedAt() == null
                || record.getTrainedAt().isAfter(today)
                || record.getCertifiedUntil() == null
                || record.getCertifiedUntil().isBefore(today)) {
            return false;
        }
        return record.getEvidenceUrls() != null
                && record.getEvidenceUrls().stream().anyMatch(url -> url != null && !url.isBlank());
    }

    private TrainingProgramDto toDto(TrainingProgram p) {
        return new TrainingProgramDto(
                p.getId(), p.getTitle(), p.getCategory(), p.getDescription(), p.getIsMandatory(), p.getCreatedAt()
        );
    }

    private EmployeeTrainingRecordDto toDto(EmployeeTrainingRecord r) {
        return new EmployeeTrainingRecordDto(
                r.getId(), r.getUserId(), r.getWorkTeamId(), toDto(r.getTrainingProgram()),
                r.getTrainedAt(), r.getTrainerName(), r.getEvidenceUrls(),
                r.getCertifiedUntil(), r.getStatus(), r.getCreatedAt(), r.getUpdatedAt()
        );
    }
}

