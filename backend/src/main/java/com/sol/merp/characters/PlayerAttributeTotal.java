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
@Table(name = "player_attribute_totals",
        uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "attribute_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerAttributeTotal {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id")
    @JsonIgnore
    private Player player;

    @Column(name = "attribute_key", nullable = false, length = 16)
    private String attributeKey;

    @Column(name = "base_value")
    private Integer baseValue;

    @Column(name = "normal_bonus")
    private Integer normalBonus;

    @Column(name = "race_bonus")
    private Integer raceBonus;

    @Column(name = "total_bonus")
    private Integer totalBonus;
}
