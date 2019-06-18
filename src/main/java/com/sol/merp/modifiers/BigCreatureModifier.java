package com.sol.merp.modifiers;

import com.sol.merp.attributes.BigCreatureSize;
import com.sol.merp.attributes.WeaponType;

public class BigCreatureModifier {
    private WeaponType weaponType;
    private BigCreatureSize bigCreatureSize;


    public Integer bigCreatureModifier(BigCreatureModifier bigCreatureModifier ) {
        Integer bigCreatureModifierNum = 0;

        if (bigCreatureModifier.bigCreatureSize.equals("giant")) {
            bigCreatureModifierNum -= 10;
        }

        if (bigCreatureModifier.weaponType.equals("normal")) {
            bigCreatureModifierNum -= 20;
        } else if (bigCreatureModifier.weaponType.equals("magic")) {
            bigCreatureModifierNum -= 10;
        } else if (bigCreatureModifier.weaponType.equals("holy")) {
            bigCreatureModifierNum += 10;
        } else if (bigCreatureModifier.weaponType.equals("monsterKiller")) {
            bigCreatureModifierNum += 20;
        }

        return  bigCreatureModifierNum;
    }
}
