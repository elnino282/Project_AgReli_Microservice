package org.example.season.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "work_teams")
@Getter
@Setter
@ToString(exclude = "members")
@EqualsAndHashCode(exclude = "members")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkTeam {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "season_id", nullable = false)
    private Long seasonId;

    @Column(name = "team_name", nullable = false)
    private String teamName;

    @Column(name = "team_leader_user_id", nullable = true)
    private Long teamLeaderUserId;

    @OneToMany(mappedBy = "workTeam", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<WorkTeamMember> members = new ArrayList<>();
}
