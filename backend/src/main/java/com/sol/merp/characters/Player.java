package com.sol.merp.characters;

import com.sol.merp.attributes.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.*;

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
    private Boolean isAlive;
    private Integer lvl;
    private Double xp;
    private PlayerActivity playerActivity;
    private AttackType attackType;
    private CritType critType;
    private PlayerTarget target;
    private Double hpMax;
    private Double hpActual;
    private Integer mm;
    private Integer tb; //TODO Hasmpap legyen azattacktype syerinti kulcsokkal és a hozzá tartozó TB értékekkel
    private Integer tbOneHanded;
    private Integer tbTwoHanded;
    private Integer tbRanged;
    private Integer tbBaseMagic;
    private Integer tbTargetMagic;
    private Integer tbUsedForDefense;
    private Integer secondaryTB; //TODO Tesó rugójához kell kkésőbb (esetleg mehet ez is a TB Hashmapba)
//    private Integer baseMagicTB;
//    private Integer targetMagicTB;
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



    //this one is used for charactercreation when starting the app
    public Player(String characterId, String name, Gender gender, Race race, PlayerClass playerClass, Integer lvl, PlayerActivity playerActivity, AttackType attackType, CritType critType,
                  PlayerTarget target, Double hpMax, Integer mm, Integer tbOneHanded, Integer tbTwoHanded, Integer tbRanged, Integer tbBaseMagic, Integer tbTargetMagic, Integer secondaryTB, Integer vb,
                  Boolean shield, Integer agilityBonus, Integer mdLenyeg, Integer mdKapcsolat, ArmorType armorType, Integer perception, Integer tracking,
                  Integer lockPicking, Integer disarmTraps, Integer objectUsage, Integer runes, Integer influence, Integer stealth) {
        this.characterId = characterId;
        this.name = name;
        this.gender = gender;
        this.race = race;
        this.playerClass = playerClass;
        this.isPlaying = false;
        this.isActive = true;
        this.isAlive = true;
        this.lvl = lvl;
        this.xp = Double.valueOf(lvl * 10000);
        this.playerActivity = playerActivity;
        this.attackType = attackType;
        this.critType = critType;
        this.target = target;
        this.hpMax = hpMax;
        this.hpActual = hpMax;
        this.mm = mm;
        this.tb = 0;
        this.tbOneHanded = tbOneHanded;
        this.tbTwoHanded = tbTwoHanded;
        this.tbRanged = tbRanged;
        this.tbBaseMagic = tbBaseMagic;
        this.tbTargetMagic = tbTargetMagic;
        this.tbUsedForDefense = 0;
        this.secondaryTB = secondaryTB;
//        this.baseMagicTB = baseMagicTB;
//        this.targetMagicTB = targetMagicTB;
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
    public Player(String characterId, String name, Gender gender, Race race, PlayerClass playerClass, Integer lvl, AttackType attackType, CritType critType,
                  Double hpMax, Integer mm, Integer tb, Integer secondaryTB, Integer vb,
                  Boolean shield, Integer agilityBonus, Integer mdLenyeg, Integer mdKapcsolat, ArmorType armorType, Integer perception, Integer tracking,
                  Integer lockPicking, Integer disarmTraps, Integer objectUsage, Integer runes, Integer influence, Integer stealth) {
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
//        this.baseMagicTB = baseMagicTB;
//        this.targetMagicTB = targetMagicTB;
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


    //    public void setTbUsedForDefense(Integer tbUsedForDefense) {
//        if (tbUsedForDefense > this.tb / 2) {
//            this.tbUsedForDefense = this.tb / 2;
//        } else this.tbUsedForDefense = tbUsedForDefense;
//    }

    //    public void setHpActual(Double hpActual) {
//        if (hpActual <= 0d) {
//            this.hpActual = 0d;
//            this.isActive = false;
//            this.playerActivity = PlayerActivity._5DoNothing;
//            this.isStunned = false;
//            this.stunnedForRounds = 0;
//        } else this.hpActual = hpActual;
//    }
//
//    public void setPlayerActivity(PlayerActivity playerActivity) {
//        if ((playerActivity.equals(PlayerActivity._1PerformMagic)) ||
//                (playerActivity.equals(PlayerActivity._2RangedAttack)) ||
//                (playerActivity.equals(PlayerActivity._3PhisicalAttackOrMovement))){
//            setIsActive(true);
//        }
//        this.playerActivity = playerActivity;
//    }
//
//    public void setStunned(Boolean stunned) {
//        if ((this.hpActual <= 0) || (this.stunnedForRounds == 0)) {
//            this.isStunned = false;
//        }
//        if (stunned) {
//            this.stunnedForRounds = 1;
//        }
//        isStunned = stunned;
//    }

//    public void setAlive(Boolean alive) {
//        if (!alive) {
//            setHpActual(0D);
//            setIsActive(false);
//            setIsStunned(false);
//            setStunnedForRounds(0);
//            setPlayerActivity(PlayerActivity._5DoNothing);
//        }
//        isAlive = alive;
//    }


    //TODO this way won't work - service method needed with same logic, check all Object when POST



}
