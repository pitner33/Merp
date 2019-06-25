package com.sol.merp.characters;

import com.sol.merp.attributes.ArmorType;
import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
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
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String characterId;
    private String name;
    private Boolean isPlaying;
    private Integer lvl;
    private Integer xp;
    private AttackType attackType;
    private CritType critType;
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
    private Boolean isStunned;
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


    public Player(String characterId, String name, Integer lvl, AttackType attackType, CritType critType, Integer hpMax, Integer mm, Integer tb, Integer secondaryTB, Integer baseMagicTB, Integer targetMagicTB, Integer vb, Boolean shield, Integer agilityBonus, Integer mdLenyeg, Integer mdKapcsolat, ArmorType armorType, Integer perception, Integer tracking, Integer lockPicking, Integer disarmTraps, Integer objectUsage, Integer runes, Integer influence, Integer stealth) {
        this.characterId = characterId;
        this.name = name;
        this.isPlaying = false;
        this.lvl = lvl;
        this.xp = lvl * 1000;
        this.attackType = attackType;
        this.critType = critType;
        this.hpMax = hpMax;
        this.hpActual = hpMax;
        this.mm = mm;
        this.tb = tb;
        this.tbUsedForDefense = 0;
        this.secondaryTB = secondaryTB;
        this.baseMagicTB = baseMagicTB;
        this.targetMagicTB = targetMagicTB;
        this.vb = vb;
        this.shield = shield;
        this.agilityBonus = agilityBonus;
        this.mdLenyeg = mdLenyeg;
        this.mdKapcsolat = mdKapcsolat;
        this.armorType = armorType;
        this.isStunned = false;
        this.penaltyForActivities = 0;
        this.hpLossPerRound = 0;
        this.perception = perception;
        this.tracking = tracking;
        this.lockPicking = lockPicking;
        this.disarmTraps = disarmTraps;
        this.objectUsage = objectUsage;
        this.runes = runes;
        this.influence = influence;
        this.stealth = stealth;
    }

//    public ArmorType getArmorType() {
//        return armorType;
//    }
//
//    public void setArmorType(ArmorType armorType) {
//        this.armorType = armorType;
//    }
//
//    public String getCharacterId() {
//        return characterId;
//    }
}
