package com.sol.merp.fight;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.characters.Player;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface FightService {

    void attack(Player attacker, Player defender);

    void attackBaseMagic(Player attacker, Player defender);

    void attackMagicBall(Player attacker, Player defender);

    void attackOtherThanBaseMagicOrMagicBall(Player attacker, Player defender);

    String getAttackResultString(Player attacker, Player defender);

    Integer attackerTBWithAllModifiers(Player attacker);

    Integer defenderVBWithAllModifiers(Player defender);

    List<String> getAttackResultRowByAttackType(Player attacker, Integer rollResult);

    String getAttackResultFromRowByDefenderArmor(List<String> attackResultRow, Player defender);

    void failRoll(Player attacker);

    List<String> getFailRollResultRow();

    void critRoll(String crit);

    Integer getBaseDamageFromAttackResult(String attackResult);

    String getCritFromAttackResult(String attackResult);

    Integer getModifiedCritRoll(Integer critRoll, String crit);

    List<String> getCritResultRow(Player attacker, Integer critRollModified);

    AttackType attackerWhichTBToUse(Player attacker);

    CritType attackerWhichCritToUse(Player attacker);

    Integer damageDone(Integer rollResult);

    String critEffect(Integer rollResult);

//    Integer critRoll(String critEffect);

    String critDescription(Integer critRoll);

    Integer critHPLoss(Integer critRoll);

    Integer critHPLossPerRound(Integer critRoll);

    Integer critPenaltyForActivities(Integer critRoll);

    Boolean critDefenderStunned(Integer critRoll);
}
