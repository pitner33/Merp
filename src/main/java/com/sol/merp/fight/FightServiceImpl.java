package com.sol.merp.fight;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.characters.Player;
import com.sol.merp.diceRoll.D100Roll;
import com.sol.merp.googlesheetloader.SheetReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.persistence.criteria.CriteriaBuilder;
import java.util.List;

@Service
public class FightServiceImpl implements FightService {
    //TODO átgondolni a harcot - ki csinálja mi kell hozzá, hogyan folyik, mik történnek benne... Ehhez a logichoz hozzáhúzni a többi classt
    //TODO JK harc sorrend MM alapján rendezve beadni a listát a frontendre

    private Player attacker;
    private Player defender;
    private D100Roll d100Roll;
    private String roll1;
    private String roll2;
    private String roll3;
    private String roll4;

    @Autowired
    private SheetReader sheetReader;

    @Override
    public void attack(Player attacker, Player defender) {
        Integer fullTB = attackerTBWithAllModifiers(attacker);
        Integer fullVB = defenderVBWithAllModifiers(defender);
        Integer rollTB = d100Roll.d100FromRoll(roll1, roll2, roll3, roll4);
        Integer rollResult = (fullTB + rollTB) - fullVB;
        //TODO táblázatból kikeresni a damageDone-t, crit eredményeket, levonogatni a Def statjaiból + KIIRATNI a kepernyore (Logic, a controllerben!!!
        List<String> attackResultRow = sheetReader.mapSlashing.get(rollResult); //TODO az attackType-na megfelelo mapbol vegye az adatokat
        //TODO List<String> attackResultRow: a rollResult alapjan a megfelelo tablazatbol vett lista
        //TODO String attackResult: ay attackResultRow alapjan az adott panceltipushoz tartozo tenyleges eredmeny (pl 25E)
        //TODO Integer attackResultDamage: az attackResult szam resze atparse-olva
        //TODO Integer attackResultCritType: az attackResult utolso karaktere
        //TODO az attackResultCritType alapjan CRIT dobas es crit ertekek (szoveges, HPadditional, HP/round, Stunned?/round, PenaltyforActions/round)
        //TODO kitalalni, hogy a /round ertekek hogyan lesznek automatice szamolva (roundszamlalo az elejen indul es jegyzi mikor kapta a buntit)
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
    public AttackType attackerWhichTBToUse(Player attacker) {
        return null;
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
    public Integer critRoll(String critEffect) {
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
