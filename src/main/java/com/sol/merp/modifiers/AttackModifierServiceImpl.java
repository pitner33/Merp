package com.sol.merp.modifiers;

import com.sol.merp.characters.NextTwoPlayersToFigthObject;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AttackModifierServiceImpl implements AttackModifierService {
    @Autowired
    PlayerService playerService;
    @Autowired
    AttackModifier attackModifier;
    @Autowired
    NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject;


    @Override
    public Integer countAttackModifier() {
        Integer attackModifierNum = 0;
        if (attackModifier.getAttackFromWeakSide()) {
            attackModifierNum += 15;
        }
        if (attackModifier.getAttackFromBehind()) {
            attackModifierNum += 20;
        }
        if (attackModifier.getDefenderSurprised()) {
            attackModifierNum += 20;
        }
        if (attackModifier.getDefenderStunned()) {
            attackModifierNum += 20;
        }
        if (attackModifier.getAttackerWeaponChange()) {
            attackModifierNum -= 30;
        }
        if (attackModifier.getAttackerHPBelow50Percent()) {
            attackModifierNum -= 20;
        }
        if (attackModifier.getAttackerMoreThan3MetersMovement()) {
            attackModifierNum -= 10;
        }

        return attackModifierNum;
    }

    @Override
    public void setAttackModifierPlayerValues() {
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        Player defender = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1);

        if (playerService.healthPercent(attacker) < 50) {
            attackModifier.setAttackerHPBelow50Percent(true);
        }

        if (defender.getIsStunned()) {
            attackModifier.setDefenderStunned(true);
        }

    }

    @Override
    public void setAttackModifierAllValues(AttackModifier attackModifier) {
        attackModifier.setAttackFromWeakSide(attackModifier.getAttackFromWeakSide());
        attackModifier.setAttackFromBehind(attackModifier.getAttackFromBehind());
        attackModifier.setDefenderSurprised(attackModifier.getDefenderSurprised());
        attackModifier.setDefenderStunned(attackModifier.getDefenderStunned());
        attackModifier.setAttackerWeaponChange(attackModifier.getAttackerWeaponChange());
        attackModifier.setAttackerHPBelow50Percent(attackModifier.getAttackerHPBelow50Percent());
        attackModifier.setAttackerMoreThan3MetersMovement(attackModifier.getAttackerMoreThan3MetersMovement());
    }
}
