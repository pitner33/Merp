package com.sol.merp.fight;

import com.sol.merp.attributes.ArmorType;
import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerListObject;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import com.sol.merp.diceRoll.D100Roll;
import com.sol.merp.dto.AttackResultsDTO;
import com.sol.merp.googlesheetloader.MapsFromTabs;
import com.sol.merp.modifiers.AttackModifierService;
import com.sol.merp.characters.NextTwoPlayersToFigthObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FightServiceImpl implements FightService {
    //TODO átgondolni a harcot - ki csinálja mi kell hozzá, hogyan folyik, mik történnek benne... Ehhez a logichoz hozzáhúzni a többi classt
    //TODO JK harc sorrend MM alapján rendezve beadni a listát a frontendre

    private Logger logger = LoggerFactory.getLogger(this.getClass());

    @Autowired
    private MapsFromTabs mapsFromTabs;

    @Autowired
    PlayerRepository playerRepository;

    @Autowired
    PlayerService playerService;

    @Autowired
    D100Roll d100Roll;

    @Autowired
    PlayerListObject adventurerOrderedListObject;

    @Autowired
    AttackModifierService attackModifierService;

    @Autowired
    com.sol.merp.modifiers.RangedMagicModifierService rangedMagicModifierService;

    @Autowired
    NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject;

    private Integer computeTb(Player p) {
        if (p == null || p.getAttackType() == null) return p != null ? p.getTb() : null;
        switch (p.getAttackType()) {
            case slashing:
            case blunt:
            case clawsAndFangs:
            case grabOrBalance:
                return p.getTbOneHanded();
            case twoHanded:
                return p.getTbTwoHanded();
            case ranged:
                return p.getTbRanged();
            case baseMagic:
                return p.getTbBaseMagic();
            case magicBall:
            case magicProjectile:
                return p.getTbTargetMagic();
            default:
                return p.getTb();
        }
    }

    public static class ModifiedRollResult {
        public int open;
        public int attackerTb;
        public int attackerTbForDefense; // negative in total
        public int attackerPenalty; // negative in total
        public int defenderVb; // negative in total
        public int defenderTbForDefense; // negative in total
        public int defenderShield; // -25 if has shield
        public int defenderPenalty; // positive in total
        public int modifiers; // melee or ranged/magic
        public int total;
    }

    public ModifiedRollResult computeModifiedRoll(int openTotal) {
        List<Player> pairSafe = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pairSafe == null || pairSafe.size() < 2) {
            logger.warn("computeModifiedRoll called without an active pair; returning minimal result. openTotal={}", openTotal);
            ModifiedRollResult res = new ModifiedRollResult();
            res.open = openTotal;
            res.attackerTb = 0;
            res.attackerTbForDefense = 0;
            res.attackerPenalty = 0;
            res.defenderVb = 0;
            res.defenderTbForDefense = 0;
            res.defenderShield = 0;
            res.defenderPenalty = 0;
            res.modifiers = 0;
            res.total = openTotal;
            return res;
        }

        Player attacker = pairSafe.get(0);
        Player defender = pairSafe.get(1);

        int attackerTbBase = attacker != null ? (computeTb(attacker) != null ? computeTb(attacker) : 0) : 0;
        int cAttackerTBForDefense = -Math.abs(attacker != null ? (attacker.getTbUsedForDefense() != null ? attacker.getTbUsedForDefense() : 0) : 0);
        int cAttackerPenalty = -Math.abs(attacker != null ? (attacker.getPenaltyOfActions() != null ? attacker.getPenaltyOfActions() : 0) : 0);
        int cDefenderVB = -Math.abs(defender != null ? (defender.getVb() != null ? defender.getVb() : 0) : 0);
        int cDefenderTbForDefense = -Math.abs(defender != null ? (defender.getTbUsedForDefense() != null ? defender.getTbUsedForDefense() : 0) : 0);
        int cDefenderShield = (defender != null && Boolean.TRUE.equals(defender.getShield())) ? -25 : 0;
        int cDefenderPenalty = Math.abs(defender != null ? (defender.getPenaltyOfActions() != null ? defender.getPenaltyOfActions() : 0) : 0);

        // Modifiers by activity
        int modifiers = 0;
        if (attacker != null && attacker.getPlayerActivity() != null) {
            if (attacker.getPlayerActivity().equals(PlayerActivity._3PhisicalAttackOrMovement)) {
                modifiers = attackModifierService.countAttackModifier();
            } else if (attacker.getPlayerActivity().equals(PlayerActivity._2RangedAttack)
                    || attacker.getPlayerActivity().equals(PlayerActivity._1PerformMagic)) {
                modifiers = rangedMagicModifierService.countRangedMagicModifier();
            }
        } else {
            modifiers = attackModifierService.countAttackModifier();
        }

        int total = openTotal + attackerTbBase + cAttackerTBForDefense + cAttackerPenalty + cDefenderVB + cDefenderTbForDefense + cDefenderShield + cDefenderPenalty + modifiers;

        ModifiedRollResult res = new ModifiedRollResult();
        res.open = openTotal;
        res.attackerTb = attackerTbBase;
        res.attackerTbForDefense = cAttackerTBForDefense;
        res.attackerPenalty = cAttackerPenalty;
        res.defenderVb = cDefenderVB;
        res.defenderTbForDefense = cDefenderTbForDefense;
        res.defenderShield = cDefenderShield;
        res.defenderPenalty = cDefenderPenalty;
        res.modifiers = modifiers;
        res.total = total;
        return res;
    }

    @Override
    public void attack(Player attacker, Player defender) {
        //differentiate between attack types with different logig
        if (attacker.getAttackType().equals(AttackType.baseMagic)) {
            attackBaseMagic(attacker, defender);
        } else if (attacker.getAttackType().equals(AttackType.magicBall)) {
            attackMagicBall(attacker, defender);
        } else attackOtherThanBaseMagicOrMagicBall(attacker, defender);
    }

    @Override
    public void attackBaseMagic(Player attacker, Player defender) {
        //TODO hozzaigazitani a logicot az OtherThan...methodhoz
        AttackResultsDTO attackResultsDTO = new AttackResultsDTO();
        attackResultsDTO.setAttackResult(getAttackResultString(attacker, defender, attackResultsDTO));

        //check if the attackresult is "Fail"
        if (attackResultsDTO.getAttackResult().equals("Fail")) {
            failRoll(attacker, attackResultsDTO);
            return;
        }
    }

    @Override
    public void attackMagicBall(Player attacker, Player defender) {
        //TODO hozzaigazitani a logicot az OtherThan...methodhoz
        AttackResultsDTO attackResultsDTO = new AttackResultsDTO();
        attackResultsDTO.setAttackResult(getAttackResultString(attacker, defender, attackResultsDTO));

        //check if the attackresult is "Fail"
        if (attackResultsDTO.getAttackResult().equals("Fail")) {
            failRoll(attacker, attackResultsDTO);
            return;
        }
    }

    @Override
    public AttackResultsDTO attackOtherThanBaseMagicOrMagicBall(Player attacker, Player defender) {
        AttackResultsDTO attackResultsDTO = new AttackResultsDTO();
        attackResultsDTO.setAttackResult(getAttackResultString(attacker, defender, attackResultsDTO));

        //check if the attackresult is "Fail"
        if (attackResultsDTO.getAttackResult().equals("Fail")) {
            //even in case of Fail, the defender suffers damage from bleeding in the given round
            attackResultsDTO.setFullDamage(defender.getHpLossPerRound());
            defender.setHpActual(defender.getHpActual() - attackResultsDTO.getFullDamage());
            logger.info("ATTACK: Defender actual HP: {}", defender.getHpActual());
            playerRepository.save(defender);

            failRoll(attacker, attackResultsDTO);
            return attackResultsDTO;
        } else {
            //get the Damage as Integer and crit as String from attackResult String
            attackResultsDTO.setBaseDamage(getBaseDamageFromAttackResult(attackResultsDTO.getAttackResult()));
            attackResultsDTO.setCrit(getCritFromAttackResult(attackResultsDTO.getAttackResult()));
            logger.info("BaseDamage : {}", attackResultsDTO.getBaseDamage());
            logger.info("Crit : {}", attackResultsDTO.getCrit());

            if (!attackResultsDTO.getCrit().equals("X")) {
                critRoll(attacker, attackResultsDTO.getCrit(), attackResultsDTO);
            }

            attackResultsDTO.setFullDamageWithoutBleeding(attackResultsDTO.getBaseDamage() + attackResultsDTO.getCritResultAdditionalDamage());
            logger.info("CRIT: additional damage from crit: {}", attackResultsDTO.getCritResultAdditionalDamage());
            logger.info("ATTACK: Full damage without bleeding: {}", attackResultsDTO.getFullDamageWithoutBleeding());

            logger.info("CRIT: effect: {}", attackResultsDTO.getCritResultText());
            logger.info("CRIT: Hp loss per round: {}", attackResultsDTO.getCritResultHPLossPerRound());

            defender.setHpLossPerRound(defender.getHpLossPerRound() + attackResultsDTO.getCritResultHPLossPerRound());
            attackResultsDTO.setFullDamage(attackResultsDTO.getFullDamageWithoutBleeding() + defender.getHpLossPerRound());
            logger.info("ATTACK: Full damage: {}", attackResultsDTO.getFullDamage());

            defender.setPenaltyOfActions(defender.getPenaltyOfActions() + attackResultsDTO.getCritResultPenaltyOfActions());
            logger.info("CRIT: Penalty of actions: {}", attackResultsDTO.getCritResultPenaltyOfActions());

            if (attackResultsDTO.getCritResultStunnedForRounds() != 0) {
                defender.setStunnedForRounds(defender.getStunnedForRounds() + attackResultsDTO.getCritResultStunnedForRounds());
                defender.setIsStunned(true);
                defender.setPlayerActivity(PlayerActivity._5DoNothing);
                logger.info("CRIT: Defender is stunned for {} rounds.", defender.getStunnedForRounds());
            }

            defender.setHpActual(defender.getHpActual() - attackResultsDTO.getFullDamage());
            logger.info("ATTACK: Defender actual HP: {}", defender.getHpActual());

            if (attackResultsDTO.getCritResultsInstantDeath()) {
                defender.setIsAlive(false);
            }

            // ordered list refreshed with defenderstats after every fightpairs KEEPING the same order
            playerService.refreshAdventurerOrderedListObject(defender);

            playerService.experienceCounterHPLoss(attackResultsDTO.getFullDamage());
            playerService.experienceCounterCrit(attackResultsDTO.getCrit());
            playerService.experienceCounterKill();

            return attackResultsDTO;
        }

    }

    @Override
    public String getAttackResultString(Player attacker, Player defender, AttackResultsDTO attackResultsDTO) {
        Integer fullTB = attackerTBWithAllModifiers(attacker);
        Integer fullVB = defenderVBWithAllModifiers(defender);

        //at this point d100Roll is set by one of the prefight endpoints /merp/adventure/fightrandomroll or /merp/adventure/fightdiceroll
//        Integer d100OpenRoll = d100Roll.d100FromRoll(roll1, roll2, roll3, roll4); Todo kesobb megoldani a kockavel dobast es a beirast
        Integer d100OpenRoll = d100Roll.getD100Roll();
        Integer rollResult = (fullTB + d100OpenRoll) - fullVB;

        attackResultsDTO.setD100OpenRoll(d100OpenRoll);
        attackResultsDTO.setRollResult(rollResult);

//check if D100 roll gives Fail result - that's the only way for Fail
        List<String> attackResultRowD100 = getAttackResultRowByAttackType(attacker, d100OpenRoll);
        String attackResultD100 = getAttackResultFromRowByDefenderArmor(attackResultRowD100, defender);

        if (attackResultD100.equals("Fail")) {
            return attackResultD100;
        } else {
//based on attack type and rollResult get the attack resultrow from the corresponding map
            List<String> attackResultRow = getAttackResultRowByAttackType(attacker, rollResult);
            logger.info("AttackResultRow : {}", attackResultRow);

            //from the resultRow get the actual result (eg. 25E) as String by defender's armor
            String attackResult = getAttackResultFromRowByDefenderArmor(attackResultRow, defender);
            logger.info("AttackResult : {}", attackResult);
//check if attackresult gives Fail - in which case it must be overwrite to 0X, because fail is not possible in this level
            if (attackResult.equals("Fail")) {
                return "0X";
            } else return attackResult;
        }
    }

    @Override
    public Integer attackerTBWithAllModifiers(Player attacker) {
/*TODO
      magical attack:
        attacktype:
            baseMagic: UTANANEZNI
            magicBall: UTANANEZNI
            magicProjectile:
                d100 open roll (--> success/fail)
                    IF success:
                        TB = attacker tb -TBforDefense - penaltyForActions KULON METHOD?
                        attackmodifier
                        RANGEMODIFIER
                        MAGICMODIFIER
                        IF bigcreature --> bigCreature modifier
                        special modifier
                    IF fail:
                        failmodifier
      phisical attack:
        ranged:
            attacktype(ranged)/crittype
            d100 open roll (--> success/fail)
                IF success:
                    TB = attacker tb -TBforDefense - penaltyForActions KULON METHOD?
                    attackmodifier
                    RANGEMODIFIER
                    IF bigcreature --> bigCreature modifier
                    special modifier
                IF fail:
                    failmodifier
        melee:
            attacktype(slashing/blunt/twohand/piercing/clawsFangs/grabBalance)/crittype
            d100 open roll (--> success/fail)
                IF success:
                     TB = attacker tb -TBforDefense - penaltyForActions KULON METHOD?
                    + attackmodifier
                    + IF bigcreature --> bigCreature modifier
                    + special modifier
                IF fail:
                    failmodifier
TODO      */
        Integer meleeOrRangedMagicModifier = 0;
        if (attacker.getPlayerActivity() != null) {
            if (attacker.getPlayerActivity().equals(PlayerActivity._3PhisicalAttackOrMovement)) {
                meleeOrRangedMagicModifier = attackModifierService.countAttackModifier();
            } else if (attacker.getPlayerActivity().equals(PlayerActivity._2RangedAttack)
                    || attacker.getPlayerActivity().equals(PlayerActivity._1PerformMagic)) {
                meleeOrRangedMagicModifier = rangedMagicModifierService.countRangedMagicModifier();
            }
        } else {
            meleeOrRangedMagicModifier = attackModifierService.countAttackModifier();
        }

        logger.info("modifier {}", meleeOrRangedMagicModifier);
        logger.info("TB player {}", attacker.getTb());
        logger.info("TB count {}", attacker.getTb() - attacker.getTbUsedForDefense() + meleeOrRangedMagicModifier);
        logger.info("TB counted: " + (attacker.getTb() - attacker.getTbUsedForDefense()));
        return attacker.getTb() - attacker.getTbUsedForDefense() + meleeOrRangedMagicModifier;
    }

    @Override
    public Integer defenderVBWithAllModifiers(Player defender) {
/* TODO
        VB=defenderVB + shield - penaltyForActions
        ...
        Magia MD ide vagy kulon??? merthogz ay roll!

 TODO     */
        logger.info("VB counted: " + (defender.getVb() + defender.getTbUsedForDefense()));
        return defender.getVb() + defender.getTbUsedForDefense();
    }

    @Override
    public List<String> getAttackResultRowByAttackType(Player attacker, Integer rollResult) {
        if (rollResult < 1) {
            rollResult = 1;
        }

        if (attacker.getAttackType().equals(AttackType.baseMagic)) {
            if (rollResult > 100) {
                rollResult = 100;
            }
            return mapsFromTabs.getMapBaseMagic().get(rollResult);
        }

        if (attacker.getAttackType().equals(AttackType.magicBall)) {
            if (rollResult > 100) {
                rollResult = 100;
            }
            return mapsFromTabs.getMapMagicBall().get(rollResult);
        }

        if (rollResult > 150) {
            rollResult = 150;
        }

        if (attacker.getAttackType().equals(AttackType.slashing)) {
            return mapsFromTabs.getMapSlashing().get(rollResult);
        } else if (attacker.getAttackType().equals(AttackType.blunt)) {
            return mapsFromTabs.getMapBlunt().get(rollResult);
        } else if (attacker.getAttackType().equals(AttackType.twoHanded)) {
            return mapsFromTabs.getMapTwoHanded().get(rollResult);
        } else if (attacker.getAttackType().equals(AttackType.ranged)) {
            return mapsFromTabs.getMapRanged().get(rollResult);
        } else if (attacker.getAttackType().equals(AttackType.clawsAndFangs)) {
            return mapsFromTabs.getMapClawsAndFangs().get(rollResult);
        } else if (attacker.getAttackType().equals(AttackType.grabOrBalance)) {
            return mapsFromTabs.getMapGrabOrBalance().get(rollResult);
        } else if (attacker.getAttackType().equals(AttackType.magicProjectile)) {
            return mapsFromTabs.getMapMagicProjectile().get(rollResult);
        } else throw new IllegalStateException("Attack type invalid: " + attacker.getAttackType());
    }

    @Override
    public String getAttackResultFromRowByDefenderArmor(List<String> attackResultRow, Player defender) {
        if (defender.getArmorType().equals(ArmorType.plate)) {
            return attackResultRow.get(0);
        } else if (defender.getArmorType().equals(ArmorType.chainmail)) {
            return attackResultRow.get(1);
        } else if (defender.getArmorType().equals(ArmorType.heavyLeather)) {
            return attackResultRow.get(2);
        } else if (defender.getArmorType().equals(ArmorType.leather)) {
            return attackResultRow.get(3);
        } else if (defender.getArmorType().equals(ArmorType.none)) {
            return attackResultRow.get(4);
        } else throw new IllegalStateException("Armor type invalid: " + defender.getArmorType());
    }

    @Override
    public void failRoll(Player attacker, AttackResultsDTO attackResultsDTO) {
        List<String> failRollResultRow = getFailRollResultRow();

        if (attacker.getAttackType().equals(AttackType.baseMagic) ||
                attacker.getAttackType().equals(AttackType.magicBall) ||
                attacker.getAttackType().equals(AttackType.magicProjectile)) {
            attackResultsDTO.setFailResultText(failRollResultRow.get(2));
        } else if (attacker.getAttackType().equals(AttackType.ranged)) {
            attackResultsDTO.setFailResultText(failRollResultRow.get(1));
        } else attackResultsDTO.setFailResultText(failRollResultRow.get(0));

        logger.info("Fail effect: {}", attackResultsDTO.getFailResultText());
    }

    @Override
    public List<String> getFailRollResultRow() {
        //fail roll open D100
        Integer failRoll = d100Roll.d100RandomOpen();
        if (failRoll < 5) {
            failRoll = 5;
        }
        if (failRoll > 120) {
            failRoll = 120;
        }

        return mapsFromTabs.getMapFail().get(failRoll);
    }


    @Override
    public void critRoll(Player attacker, String crit, AttackResultsDTO attackResultsDTO) {
        //TODO Manage 'if' type and 'instant death' results - more columns in GoogleSheet and fields for them in AttackresultDTO
        //crit roll between 0-100
        Integer critRoll = d100Roll.d100Random();
        Integer critRollModified = getModifiedCritRoll(critRoll, crit);
        logger.info("CRIT: CritRoll : {}", critRoll);
        logger.info("CRIT: Modified CritRoll : {}", critRollModified);

//        critRollModified = 120; //TODO delete! Only for testing

        //ctitRoll Results
        List<String> critResultRow = getCritResultRow(attacker, critRollModified);

        attackResultsDTO.setCritResultText(critResultRow.get(0));
        attackResultsDTO.setCritResultAdditionalDamage(Integer.parseInt(critResultRow.get(1)));
        attackResultsDTO.setCritResultHPLossPerRound(Integer.parseInt(critResultRow.get(2)));
        attackResultsDTO.setCritResultStunnedForRounds(Integer.parseInt(critResultRow.get(3)));
        attackResultsDTO.setCritResultPenaltyOfActions(Integer.parseInt(critResultRow.get(4)));
        if (critResultRow.get(5).equals("1")) {
            attackResultsDTO.setCritResultsInstantDeath(true);
        }
    }

    @Override
    public Integer getBaseDamageFromAttackResult(String attackResult) {
        return Integer.parseInt(attackResult.substring(0, attackResult.length() - 1));
    }

    @Override
    public String getCritFromAttackResult(String attackResult) {
        return attackResult.substring(attackResult.length() - 1);
    }

    @Override
    public Integer getModifiedCritRoll(Integer critRoll, String crit) {
        if (crit.equals("X")) {
            return 0;
        } else if (crit.equals("T")) {
            return critRoll - 50;
        } else if (crit.equals("A")) {
            return critRoll - 20;
        } else if (crit.equals("B")) {
            return critRoll - 10;
        } else if (crit.equals("C")) {
            return critRoll;
        } else if (crit.equals("D")) {
            return critRoll + 10;
        } else if (crit.equals("E")) {
            return critRoll + 20;
        } else
            throw new IllegalStateException("Cannot get critRollResult from critRoll: " + critRoll + " and crit: " + crit);
    }

    @Override
    public List<String> getCritResultRow(Player attacker, Integer critRollModified) {
        if (critRollModified < 5) {
            critRollModified = 5;
        }
        if (attacker.getCritType().equals(CritType.slashing)) {
            return mapsFromTabs.getMapCriticalSlashing().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.blunt)) {
            return mapsFromTabs.getMapCriticalBlunt().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.piercing)) {
            return mapsFromTabs.getMapCriticalPiercing().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.heat)) {
            return mapsFromTabs.getMapCriticalHeat().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.cold)) {
            return mapsFromTabs.getMapCriticalCold().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.electricity)) {
            return mapsFromTabs.getMapCriticalElectricity().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.balance)) {
            return mapsFromTabs.getMapCriticalBalance().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.crushing)) {
            return mapsFromTabs.getMapCriticalCrushing().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.grab)) {
            return mapsFromTabs.getMapCriticalGrab().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.bigCreaturePhisical)) {
            return mapsFromTabs.getMapCriticalBigCreaturePhisical().get(critRollModified);
        } else if (attacker.getCritType().equals(CritType.bigCreatureMagic)) {
            return mapsFromTabs.getMapCriticalBigCreatureMagic().get(critRollModified);
        } else
            throw new IllegalStateException("Cannot get critResultRow from critType: " + attacker.getCritType() + " and modified critRoll: " + critRollModified);
    }

    @Override
    public AttackResultsDTO applyResolvedAttack(Player attacker, Player defender, String attackResult) {
        AttackResultsDTO attackResultsDTO = new AttackResultsDTO();
        attackResultsDTO.setAttackResult(attackResult);

        if ("Fail".equals(attackResult)) {
            attackResultsDTO.setFullDamage(defender.getHpLossPerRound());
            defender.setHpActual(defender.getHpActual() - attackResultsDTO.getFullDamage());
            logger.info("ATTACK: Defender actual HP: {}", defender.getHpActual());
            playerRepository.save(defender);
            failRoll(attacker, attackResultsDTO);
            return attackResultsDTO;
        }

        attackResultsDTO.setBaseDamage(getBaseDamageFromAttackResult(attackResult));
        attackResultsDTO.setCrit(getCritFromAttackResult(attackResult));
        logger.info("BaseDamage : {}", attackResultsDTO.getBaseDamage());
        logger.info("Crit : {}", attackResultsDTO.getCrit());

        if (!"X".equals(attackResultsDTO.getCrit())) {
            critRoll(attacker, attackResultsDTO.getCrit(), attackResultsDTO);
        }

        attackResultsDTO.setFullDamageWithoutBleeding(attackResultsDTO.getBaseDamage() + attackResultsDTO.getCritResultAdditionalDamage());
        logger.info("CRIT: additional damage from crit: {}", attackResultsDTO.getCritResultAdditionalDamage());
        logger.info("ATTACK: Full damage without bleeding: {}", attackResultsDTO.getFullDamageWithoutBleeding());

        logger.info("CRIT: effect: {}", attackResultsDTO.getCritResultText());
        logger.info("CRIT: Hp loss per round: {}", attackResultsDTO.getCritResultHPLossPerRound());

        defender.setHpLossPerRound(defender.getHpLossPerRound() + attackResultsDTO.getCritResultHPLossPerRound());
        attackResultsDTO.setFullDamage(attackResultsDTO.getFullDamageWithoutBleeding() + defender.getHpLossPerRound());
        logger.info("ATTACK: Full damage: {}", attackResultsDTO.getFullDamage());

        defender.setPenaltyOfActions(defender.getPenaltyOfActions() + attackResultsDTO.getCritResultPenaltyOfActions());
        logger.info("CRIT: Penalty of actions: {}", attackResultsDTO.getCritResultPenaltyOfActions());

        if (attackResultsDTO.getCritResultStunnedForRounds() != 0) {
            defender.setStunnedForRounds(defender.getStunnedForRounds() + attackResultsDTO.getCritResultStunnedForRounds());
            defender.setIsStunned(true);
            defender.setPlayerActivity(PlayerActivity._5DoNothing);
            logger.info("CRIT: Defender is stunned for {} rounds.", defender.getStunnedForRounds());
        }

        defender.setHpActual(defender.getHpActual() - attackResultsDTO.getFullDamage());
        logger.info("ATTACK: Defender actual HP: {}", defender.getHpActual());

        if (Boolean.TRUE.equals(attackResultsDTO.getCritResultsInstantDeath())) {
            defender.setIsAlive(false);
        }

        playerService.refreshAdventurerOrderedListObject(defender);
        playerService.experienceCounterHPLoss(attackResultsDTO.getFullDamage());
        playerService.experienceCounterCrit(attackResultsDTO.getCrit());
        playerService.experienceCounterKill();

        playerRepository.save(defender);

        return attackResultsDTO;
    }

    @Override
    public AttackResultsDTO applyResolvedAttackWithCritRoll(Player attacker, Player defender, String attackResult, Integer critRoll) {
        AttackResultsDTO attackResultsDTO = new AttackResultsDTO();
        attackResultsDTO.setAttackResult(attackResult);

        if ("Fail".equals(attackResult)) {
            attackResultsDTO.setFullDamage(defender.getHpLossPerRound());
            defender.setHpActual(defender.getHpActual() - attackResultsDTO.getFullDamage());
            logger.info("ATTACK: Defender actual HP: {}", defender.getHpActual());
            playerRepository.save(defender);
            failRoll(attacker, attackResultsDTO);
            return attackResultsDTO;
        }

        attackResultsDTO.setBaseDamage(getBaseDamageFromAttackResult(attackResult));
        attackResultsDTO.setCrit(getCritFromAttackResult(attackResult));
        logger.info("BaseDamage : {}", attackResultsDTO.getBaseDamage());
        logger.info("Crit : {}", attackResultsDTO.getCrit());

        // If crit exists, use provided critRoll instead of rolling here
        if (!"X".equals(attackResultsDTO.getCrit())) {
            Integer modified = getModifiedCritRoll(critRoll != null ? critRoll : 0, attackResultsDTO.getCrit());
            List<String> row = getCritResultRow(attacker, modified);
            attackResultsDTO.setCritResultText(row.get(0));
            attackResultsDTO.setCritResultAdditionalDamage(Integer.parseInt(row.get(1)));
            attackResultsDTO.setCritResultHPLossPerRound(Integer.parseInt(row.get(2)));
            attackResultsDTO.setCritResultStunnedForRounds(Integer.parseInt(row.get(3)));
            attackResultsDTO.setCritResultPenaltyOfActions(Integer.parseInt(row.get(4)));
            if (row.get(5).equals("1")) {
                attackResultsDTO.setCritResultsInstantDeath(true);
            }
        }

        attackResultsDTO.setFullDamageWithoutBleeding(attackResultsDTO.getBaseDamage() + attackResultsDTO.getCritResultAdditionalDamage());
        logger.info("CRIT: additional damage from crit: {}", attackResultsDTO.getCritResultAdditionalDamage());
        logger.info("ATTACK: Full damage without bleeding: {}", attackResultsDTO.getFullDamageWithoutBleeding());

        logger.info("CRIT: effect: {}", attackResultsDTO.getCritResultText());
        logger.info("CRIT: Hp loss per round: {}", attackResultsDTO.getCritResultHPLossPerRound());

        defender.setHpLossPerRound(defender.getHpLossPerRound() + attackResultsDTO.getCritResultHPLossPerRound());
        attackResultsDTO.setFullDamage(attackResultsDTO.getFullDamageWithoutBleeding() + defender.getHpLossPerRound());
        logger.info("ATTACK: Full damage: {}", attackResultsDTO.getFullDamage());

        defender.setPenaltyOfActions(defender.getPenaltyOfActions() + attackResultsDTO.getCritResultPenaltyOfActions());
        logger.info("CRIT: Penalty of actions: {}", attackResultsDTO.getCritResultPenaltyOfActions());

        if (attackResultsDTO.getCritResultStunnedForRounds() != 0) {
            defender.setStunnedForRounds(defender.getStunnedForRounds() + attackResultsDTO.getCritResultStunnedForRounds());
            defender.setIsStunned(true);
            defender.setPlayerActivity(PlayerActivity._5DoNothing);
            logger.info("CRIT: Defender is stunned for {} rounds.", defender.getStunnedForRounds());
        }

        defender.setHpActual(defender.getHpActual() - attackResultsDTO.getFullDamage());
        logger.info("ATTACK: Defender actual HP: {}", defender.getHpActual());

        if (Boolean.TRUE.equals(attackResultsDTO.getCritResultsInstantDeath())) {
            defender.setIsAlive(false);
        }

        playerService.refreshAdventurerOrderedListObject(defender);
        playerService.experienceCounterHPLoss(attackResultsDTO.getFullDamage());
        playerService.experienceCounterCrit(attackResultsDTO.getCrit());
        playerService.experienceCounterKill();

        playerRepository.save(defender);

        return attackResultsDTO;
    }

    @Override
    public void decreaseStunnedForRoundCounter() {
        adventurerOrderedListObject.getPlayerList()
                .stream()
                .filter(Player::getIsStunned)
                .forEach(player -> {
                    player.setStunnedForRounds(player.getStunnedForRounds() - 1);
                    playerRepository.save(player);
                });


    }


    @Override
    public AttackType attackerWhichTBToUse(Player attacker) {
        return attacker.getAttackType();
    }

    @Override
    public CritType attackerWhichCritToUse(Player attacker) {
        return null;
    }

    @Override
    public Integer damageDone(Integer rollResult) {
        return null;
    }

    @Override
    public String critEffect(Integer rollResult) {
        return null;
    }

    @Override
    public String critDescription(Integer critRoll) {
        return null;
    }

    @Override
    public Integer critHPLoss(Integer critRoll) {
        return null;
    }

    @Override
    public Integer critHPLossPerRound(Integer critRoll) {
        return null;
    }

    @Override
    public Integer critPenaltyForActivities(Integer critRoll) {
        return null;
    }

    @Override
    public Boolean critDefenderStunned(Integer critRoll) {
        return null;
    }


}
