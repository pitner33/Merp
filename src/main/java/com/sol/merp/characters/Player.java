package com.sol.merp.characters;

import com.sol.merp.attributes.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;

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
    private Gender gender;
    private Race race;
    private PlayerClass playerClass;
    private Boolean isPlaying;
    private Boolean isActive; //capable for actions
    private Integer lvl;
    private Double xp;
    private PlayerActivity playerActivity;
    private AttackType attackType;
    private CritType critType;
    private PlayerTarget target;
    private Double hpMax;
    private Double hpActual; //TODO setter cannot go below 0 - in case of dead character
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
    private Integer stunnedForRounds;
    private Integer penaltyOfActions;
    private Integer hpLossPerRound;
    private Integer perception;
    private Integer tracking; //nyomolvasas
    private Integer lockPicking; //zarnyitas
    private Integer disarmTraps; //csapdasemlegesites
    private Integer objectUsage; //targyhasznalat
    private Integer runes; //runaolvasas
    private Integer influence; //befolyasolas
    private Integer stealth; //lopakodas/rejtozkodes




    public Player(String characterId, String name, Gender gender, Race race, PlayerClass playerClass, Integer lvl, AttackType attackType, CritType critType, PlayerTarget target, Double hpMax, Integer mm, Integer tb, Integer secondaryTB, Integer baseMagicTB, Integer targetMagicTB, Integer vb, Boolean shield, Integer agilityBonus, Integer mdLenyeg, Integer mdKapcsolat, ArmorType armorType, Integer perception, Integer tracking, Integer lockPicking, Integer disarmTraps, Integer objectUsage, Integer runes, Integer influence, Integer stealth) {
        this.characterId = characterId;
        this.name = name;
        this.gender = gender;
        this.race = race;
        this.playerClass = playerClass;
        this.isPlaying = false;
        this.isActive = true;
        this.lvl = lvl;
        this.xp = Double.valueOf(lvl * 1000);
        this.playerActivity = PlayerActivity._5DoNothing;
        this.attackType = attackType;
        this.critType = critType;
        this.target = target;
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
        this.stunnedForRounds = 0;
        this.penaltyOfActions = 0;
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

    //TODO delete / ideiglenes a playertarget beallitashoz
    public Player(String characterId, String name, Gender gender, Race race, PlayerClass playerClass, Integer lvl, AttackType attackType, CritType critType, Double hpMax, Integer mm, Integer tb, Integer secondaryTB, Integer baseMagicTB, Integer targetMagicTB, Integer vb, Boolean shield, Integer agilityBonus, Integer mdLenyeg, Integer mdKapcsolat, ArmorType armorType, Integer perception, Integer tracking, Integer lockPicking, Integer disarmTraps, Integer objectUsage, Integer runes, Integer influence, Integer stealth) {
        this.characterId = characterId;
        this.name = name;
        this.gender = gender;
        this.race = race;
        this.playerClass = playerClass;
        this.isPlaying = false;
        this.isActive = true;
        this.lvl = lvl;
        this.xp = Double.valueOf(lvl * 1000);
        this.playerActivity = PlayerActivity._5DoNothing;
        this.attackType = attackType;
        this.critType = critType;
        this.target = PlayerTarget.none;
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
        this.stunnedForRounds = 0;
        this.penaltyOfActions = 0;
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

    public void setHpActual(Double hpActual) {
        if (hpActual <= 0d) {
            this.hpActual = 0d;
            this.isActive = false;
            this.playerActivity = PlayerActivity._5DoNothing;
        } else this.hpActual = hpActual;
    }

    public void setActive() {
        if ((this.hpActual <= 0 ) || (this.playerActivity == PlayerActivity._5DoNothing) || (this.isStunned)) {
            isActive = false;
        } else isActive = true;
    }

    public void setPlayerActivity(PlayerActivity playerActivity) {
        if (this.hpActual <= 0) {
            this.playerActivity = PlayerActivity._5DoNothing;
        } else this.playerActivity = playerActivity;
    }
}
