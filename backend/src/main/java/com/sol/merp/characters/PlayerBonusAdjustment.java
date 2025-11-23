package com.sol.merp.characters;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
@Table(name = "player_bonus_adjustments",
        uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "bonus_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerBonusAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id")
    @JsonIgnore
    private Player player;

    @Column(name = "bonus_key", nullable = false, length = 64)
    private String bonusKey;

    @Column(nullable = false, length = 128)
    private String label;

    @Column(name = "attribute_key", length = 16)
    private String attributeKey;

    @Column(name = "attribute_bonus")
    private Integer attributeBonus;

    @Builder.Default
    @Column(name = "item_bonus")
    private Integer itemBonus = 0;

    @Builder.Default
    @Column(name = "special_bonus")
    private Integer specialBonus = 0;

    @Column(name = "total_bonus")
    private Integer totalBonus;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;
}
