package com.sol.merp.modifiers;

import com.sol.merp.attributes.BigCreatureSize;
import com.sol.merp.attributes.WeaponSpecType;
import org.springframework.stereotype.Component;

@Component
public class BigCreatureModifier {

    public Integer countBigCreatureModifier(WeaponSpecType weaponSpecType, BigCreatureSize bigCreatureSize) {
        Integer bigCreatureModifierNum = 0;

        if (bigCreatureSize.equals(BigCreatureSize.giant)) {
            bigCreatureModifierNum -= 10;
        }

        if (weaponSpecType.equals(WeaponSpecType.normal)) {
            bigCreatureModifierNum -= 20;
        } else if (weaponSpecType.equals(WeaponSpecType.magic)) {
            bigCreatureModifierNum -= 10;
        } else if (weaponSpecType.equals(WeaponSpecType.mithril)) {
            bigCreatureModifierNum += 0;
        } else if (weaponSpecType.equals(WeaponSpecType.holy)) {
            bigCreatureModifierNum += 10;
        } else if (weaponSpecType.equals(WeaponSpecType.monsterKiller)) {
            bigCreatureModifierNum += 20;
        }

        return bigCreatureModifierNum;
    }
}
