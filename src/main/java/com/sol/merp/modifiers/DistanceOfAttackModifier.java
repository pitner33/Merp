package com.sol.merp.modifiers;

import com.sol.merp.attributes.DistanceOfAttack;

public class DistanceOfAttackModifier {

    public Integer distanceOfAttackModifier(DistanceOfAttack distanceOfAttack) {
        Integer distanceOfAttackModifierNum = 0;

        if (distanceOfAttack.equals(DistanceOfAttack.m3)) {
            distanceOfAttackModifierNum += 35;
        } else if (distanceOfAttack.equals(DistanceOfAttack.m30)) {
            distanceOfAttackModifierNum -= 20;
        } else if (distanceOfAttack.equals(DistanceOfAttack.m60)) {
            distanceOfAttackModifierNum -= 40;
        } else if (distanceOfAttack.equals(DistanceOfAttack.m90)) {
            distanceOfAttackModifierNum -= 55;
        } else if (distanceOfAttack.equals(DistanceOfAttack.m90plus)) {
            distanceOfAttackModifierNum -= 75;
        }

        return distanceOfAttackModifierNum;
    }
}
