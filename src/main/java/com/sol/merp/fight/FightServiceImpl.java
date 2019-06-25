package com.sol.merp.fight;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.characters.Player;
import com.sol.merp.diceRoll.D100Roll;
import org.springframework.stereotype.Service;

import javax.persistence.criteria.CriteriaBuilder;

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

    @Override
    public void attack(Player attacker, Player defender) {
        Integer fullTB = attackerTBWithAllModifiers(attacker);
        Integer fullVB = defenderVBWithAllModifiers(defender);
        Integer rollTB = d100Roll.d100FromRoll(roll1, roll2, roll3, roll4);
        Integer rollResult = (fullTB + rollTB) - fullVB;
        //TODO táblázatból kikeresni a damageDone-t, crit eredményeket, levonogatni a Def statjaiból + KIIRATNI a kepernyore (Logic, a controllerben!!!

    }

    @Override
    public Integer attackerTBWithAllModifiers(Player attacker) {
        return null;
    }

    @Override
    public Integer defenderVBWithAllModifiers(Player defender) {
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