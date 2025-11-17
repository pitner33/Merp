package com.sol.merp.skills;

import com.sol.merp.characters.Player;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "player_skills", uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "skill_definition_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerSkill {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id")
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_definition_id")
    private SkillDefinition skillDefinition;

    @Column(nullable = false)
    private int levelBonus = 0;

    @Column(nullable = false)
    private int attributeBonus = 0;

    @Column(nullable = false)
    private int classBonus = 0;

    @Column(nullable = false)
    private int itemBonus = 0;

    @Column(nullable = false)
    private int specialBonus = 0;

    @Column(nullable = false)
    private int totalBonus = 0;

    public void recomputeTotal() {
        this.totalBonus = levelBonus + attributeBonus + classBonus + itemBonus + specialBonus;
    }
}
