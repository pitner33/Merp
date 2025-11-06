package com.sol.merp.characters;

import com.sol.merp.attributes.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

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
    @ElementCollection
    @CollectionTable(name = "player_active_penalty_effects", joinColumns = @JoinColumn(name = "player_id"))
    private List<PenaltyEffect> activePenaltyEffects = new ArrayList<>();



    // XP level caps (index = level). Level 1..20 supported.
    private static final int[] LEVEL_CAPS = new int[] {
            0,      // 0 (unused)
            0,      // 1
            10000,  // 2
            20000,  // 3
            30000,  // 4
            40000,  // 5
            50000,  // 6
            70000,  // 7
            90000,  // 8
            110000, // 9
            130000, // 10
            150000, // 11
            180000, // 12
            210000, // 13
            240000, // 14
            270000, // 15
            300000, // 16
            340000, // 17
            380000, // 18
            420000, // 19
            450000  // 20
    };

    public static double getLevelCap(Integer level) {
        if (level == null || level < 1) return 0d;
        int idx = Math.min(Math.max(level, 1), 20);
        return (double) LEVEL_CAPS[idx];
    }

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
        this.xp = getLevelCap(lvl);
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
        this.activePenaltyEffects = new ArrayList<>();
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
        this.xp = getLevelCap(lvl);
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

    public void addPenaltyEffect(int value, int rounds) {
        if (value <= 0 || rounds <= 0) return;
        if (this.activePenaltyEffects == null) this.activePenaltyEffects = new ArrayList<>();
        this.activePenaltyEffects.add(new PenaltyEffect(value, rounds));
        recomputePenaltyOfActions();
    }

    public void recomputePenaltyOfActions() {
        int sum = 0;
        if (this.activePenaltyEffects != null) {
            for (PenaltyEffect e : this.activePenaltyEffects) {
                if (e != null && e.getValue() != null && e.getRemainingRounds() != null && e.getRemainingRounds() > 0) {
                    sum += e.getValue();
                }
            }
        }
        // Display penalties as negative values in UI
        this.penaltyOfActions = -sum;
    }

    public void decrementPenaltyEffectsForNewRound() {
        if (this.activePenaltyEffects == null) return;
        List<PenaltyEffect> keep = new ArrayList<>();
        for (PenaltyEffect e : this.activePenaltyEffects) {
            if (e == null) continue;
            Integer r = e.getRemainingRounds();
            if (r == null) continue;
            int nr = r - 1;
            e.setRemainingRounds(nr);
            if (nr > 0) keep.add(e);
        }
        this.activePenaltyEffects = keep;
        recomputePenaltyOfActions();
    }

}
