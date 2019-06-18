package com.sol.merp.modifiers;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AttackModifier {
    private Boolean attackFromWeakSide;
    private Boolean attackFromBehind;
    private Boolean defenderSurprised;
    private Boolean defenderStunned;
    private Boolean attackerWeaponChange;
    private Boolean attackerHPBelow50Percent;
    private Boolean attackerMoreThan3MetersMovement;

    public Integer attackModifier(AttackModifier attackModifier) {
        Integer attackModifierNum = 0;
        if (attackModifier.attackFromWeakSide) {
            attackModifierNum += 15;
        }
        if (attackModifier.attackFromBehind) {
            attackModifierNum += 20;
        }
        if (attackModifier.defenderSurprised) {
            attackModifierNum += 20;
        }
        if (attackModifier.defenderStunned) {
            attackModifierNum += 20;
        }
        if (attackModifier.attackFromWeakSide) {
            attackModifierNum -= 30;
        }
        if (attackModifier.attackerHPBelow50Percent) {
            attackModifierNum -= 20;
        }
        if (attackModifier.attackerMoreThan3MetersMovement) {
            attackModifierNum -= 10;
        }

        return attackModifierNum;
    }
}
