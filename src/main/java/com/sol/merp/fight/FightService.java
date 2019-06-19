package com.sol.merp.fight;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.characters.Player;
import org.springframework.stereotype.Service;

@Service
public interface FightService {

    void attack(Player attacker, Player defender);

    Integer attackerTBWithAllModifiers(Player attacker);

    Integer defenderVBWithAllModifiers(Player defender);

    AttackType attackerWhichTBToUse(Player attacker);

    CritType attackerWhichCritToUse(Player attacker);

    Integer damageDone(Integer rollResult);

    String critEffect(Integer rollResult);

    Integer critRoll(String critEffect);

    String critDescription(Integer critRoll);

    Integer critHPLoss(Integer critRoll);

    Integer critHPLossPerRound(Integer critRoll);

    Integer critPenaltyForActivities(Integer critRoll);

    Boolean critDefenderStunned(Integer critRoll);
}
