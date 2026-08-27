package org.example.season.dto.response;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingComplianceSnapshotDto {
    private Integer seasonId;
    private Integer totalMembers;
    private Integer compliantMembers;
    private List<Integer> requiredProgramIds;
    private List<String> requiredCategories;
    private Map<Long, Boolean> memberCompliance;
    private Boolean compliant;
}
