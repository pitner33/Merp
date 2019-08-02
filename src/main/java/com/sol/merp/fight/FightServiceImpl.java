package com.sol.merp.fight;

import com.sol.merp.attributes.ArmorType;
import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.diceRoll.D100Roll;
import com.sol.merp.dto.DamageAndCritDTO;
import com.sol.merp.googlesheetloader.MapsFromTabs;
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

    private D100Roll d100Roll;
    private String roll1;
    private String roll2;
    private String roll3;
    private String roll4;
    private Player attacker;
    private Player defender;

    private String failResultText = "none";

    @Autowired
    DamageAndCritDTO damageAndCritDTO;

    @Autowired
    private MapsFromTabs mapsFromTabs;

    @Autowired
    PlayerRepository playerRepository;

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
        damageAndCritDTO.setAttackResult(getAttackResultString(attacker, defender));

        //check if the attackresult is "Fail" and TODO do the Fail roll and results AND somehow STOP the process here szét kell szedni a methodot kisebb  methodokra - egy adja az eredményt és aztán a kövi az alapján iránít egyéb methodokhoz
        if (damageAndCritDTO.getAttackResult().equals("Fail")) {
            failRoll(attacker);
            return;
        }
    }

    @Override
    public void attackMagicBall(Player attacker, Player defender) {
        damageAndCritDTO.setAttackResult(getAttackResultString(attacker, defender));

        //check if the attackresult is "Fail" and TODO do the Fail roll and results AND somehow STOP the process here szét kell szedni a methodot kisebb  methodokra - egy adja az eredményt és aztán a kövi az alapján iránít egyéb methodokhoz
        if (damageAndCritDTO.getAttackResult().equals("Fail")) {
            failRoll(attacker);
            return;
        }
    }

    @Override
    public void attackOtherThanBaseMagicOrMagicBall(Player attacker, Player defender) {
        damageAndCritDTO.setAttackResult(getAttackResultString(attacker, defender));

        //check if the attackresult is "Fail" and TODO do the Fail roll and results
        if (damageAndCritDTO.getAttackResult().equals("Fail")) {
            failRoll(attacker);
            return;
        }

        //ge the Damage as Integer and crit as String from attackResult String
        damageAndCritDTO.setBaseDamage(getBaseDamageFromAttackResult(damageAndCritDTO.getAttackResult()));
        damageAndCritDTO.setCrit(getCritFromAttackResult(damageAndCritDTO.getAttackResult()));
        logger.info("BaseDamage : {}", damageAndCritDTO.getBaseDamage());
        logger.info("Crit : {}", damageAndCritDTO.getCrit());

        if (!damageAndCritDTO.getCrit().equals("X")) {
            critRoll(damageAndCritDTO.getCrit());
        }

        damageAndCritDTO.setFullDamageWithoutBleeding(damageAndCritDTO.getBaseDamage() + damageAndCritDTO.getCritResultAdditionalDamage());
        logger.info("ATTACK: Full damage without bleeding: {}", damageAndCritDTO.getFullDamageWithoutBleeding());

        logger.info("CRIT: effect: {}", damageAndCritDTO.getCritResultText());
        logger.info("CRIT: Hp loss per round: {}", damageAndCritDTO.getCritResultHPLossPerRound());

        defender.setHpLossPerRound(defender.getHpLossPerRound() + damageAndCritDTO.getCritResultHPLossPerRound());
        damageAndCritDTO.setFullDamage(damageAndCritDTO.getFullDamageWithoutBleeding() + defender.getHpLossPerRound());
        logger.info("ATTACK: Full damage: {}", damageAndCritDTO.getFullDamage());

        defender.setPenaltyOfActions(defender.getPenaltyOfActions() + damageAndCritDTO.getCritResultPenaltyOfActions());
        logger.info("CRIT: Penalty of actions: {}", damageAndCritDTO.getCritResultPenaltyOfActions());

        if (damageAndCritDTO.getCritResultStunnedForRounds() != 0) {
            defender.setStunnedForRounds(defender.getStunnedForRounds() + damageAndCritDTO.getCritResultStunnedForRounds());
            defender.setIsStunned(true);
            defender.setActivity(PlayerActivity._5DoNothing);
            logger.info("CRIT: Defender is stunned for {} rounds.", defender.getStunnedForRounds());
            //TODO kitalalni, hogy a /round ertekek hogyan lesznek automatice szamolva (roundszamlalo az elejen indul es jegyzi mikor kapta a buntit)
        }

        defender.setHpActual(defender.getHpActual() - damageAndCritDTO.getFullDamage()); //TODO HP/round??? + setHPactual methodba beletenni h nem halott-e
        logger.info("ATTACK: Defender actual HP: {}", defender.getHpActual());

        //TODO defender stats modify befor saving
        playerRepository.save(defender);
    }

    @Override
    public String getAttackResultString(Player attacker, Player defender) {
        Integer fullTB = attackerTBWithAllModifiers(attacker);
        Integer fullVB = defenderVBWithAllModifiers(defender);
        Integer rollTB = d100Roll.d100FromRoll(roll1, roll2, roll3, roll4);
        Integer rollResult = (fullTB + rollTB) - fullVB;
        //TODO táblázatból kikeresni a damageDone-t, crit eredményeket, levonogatni a Def statjaiból + KIIRATNI a kepernyore (Logic, a controllerben!!!

        //based on attack type and rollResult get the attack resultrow from the corresponding map
        List<String> attackResultRow = getAttackResultRowByAttackType(attacker, rollResult);
        logger.info("AttackResultRow : {}", attackResultRow);

        //from the resultRow get the actual result (eg. 25E) as String by defender's armor
        String attackResult = getAttackResultFromRowByDefenderArmor(attackResultRow, defender);
        logger.info("AttackResult : {}", attackResult);
        return attackResult;
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
        return null;
    }

    @Override
    public Integer defenderVBWithAllModifiers(Player defender) {
/* TODO
        VB=defenderVB + shield - penaltyForActions
        ...
        Magia MD ide vagy kulon??? merthogz ay roll!

 TODO     */
        return null;
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
    public void failRoll(Player attacker) {

        List<String> failRollResultRow = getFailRollResultRow();

        if (attacker.getAttackType().equals(AttackType.baseMagic) ||
                attacker.getAttackType().equals(AttackType.magicBall) ||
                attacker.getAttackType().equals(AttackType.magicProjectile)) {
            failResultText = failRollResultRow.get(2);
        } else if (attacker.getAttackType().equals(AttackType.ranged)) {
            failResultText = failRollResultRow.get(1);
        } else failResultText = failRollResultRow.get(0);

        logger.info("Fail effect: {}", failResultText);
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
    public void critRoll(String crit) {
        //crit roll between 0-100
        Integer critRoll = d100Roll.d100Random();
        Integer critRollModified = getModifiedCritRoll(critRoll, crit);
        logger.info("CritRoll : {}", critRoll);
        logger.info(" Modified CritRoll : {}", critRollModified);

        //ctitRoll Results
        List<String> critResultRow = getCritResultRow(attacker, critRollModified);

        damageAndCritDTO.setCritResultText(critResultRow.get(0));
        damageAndCritDTO.setCritResultAdditionalDamage(Integer.parseInt(critResultRow.get(1)));
        damageAndCritDTO.setCritResultHPLossPerRound(Integer.parseInt(critResultRow.get(2)));
        damageAndCritDTO.setCritResultStunnedForRounds(Integer.parseInt(critResultRow.get(3)));
        damageAndCritDTO.setCritResultPenaltyOfActions(Integer.parseInt(critResultRow.get(4)));
    }

    @Override
    public Integer getBaseDamageFromAttackResult(String attackResult) {
        return Integer.parseInt(attackResult.substring(0, attackResult.length() - 2));
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

//    @Override
//    public Integer critRoll(String critEffect) {
//        return null;
//    }

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
