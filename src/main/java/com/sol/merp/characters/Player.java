package com.sol.merp.characters;

import com.sol.merp.attributes.ArmorType;
import com.sol.merp.attributes.AttackType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Player {
    @Id
    private String characterId;

    private String name;
    private Integer lvl;
    private Set<AttackType> attackTypeSet;
    private Integer hpMax;
    private Integer hpActual;
    private Integer mm;
    private Integer tb;
    private Integer tbUsedForDefense;
    private Integer secondaryTB;
    private Integer baseMagicTB;
    private Integer targetMagicTB;
    private Integer vb;
    private Boolean shield;
    private Integer agilityBonus;
    private Integer mdLenyeg;
    private Integer mdKapcsolat;
    private ArmorType armorType;
    private Boolean stunned;
    private Integer penaltyForActivities;
    private Integer hpLossPerRound;
    private Integer perception;
    private Integer tracking; //nyomolvasas
    private Integer lockPicking; //zarnyitas
    private Integer disarmTraps; //csapdasemlegesites
    private Integer objectUsage; //targyhasznalat
    private Integer runes; //runaolvasas
    private Integer influence; //befolyasolas
    private Integer stealth; //lopakodas/rejtozkodes


//    public Player() {
//    }

    public ArmorType getArmorType() {
        return armorType;
    }

    public void setArmorType(ArmorType armorType) {
        this.armorType = armorType;
    }
}
