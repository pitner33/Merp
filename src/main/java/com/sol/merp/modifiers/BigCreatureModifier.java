package com.sol.merp.modifiers;

import com.sol.merp.attributes.BigCreatureSize;
import com.sol.merp.attributes.WeaponType;
import org.springframework.stereotype.Component;

@Component
public class BigCreatureModifier {

    public Integer countBigCreatureModifier(WeaponType weaponType, BigCreatureSize bigCreatureSize) {
        Integer bigCreatureModifierNum = 0;

        if (bigCreatureSize.equals(BigCreatureSize.giant)) {
            bigCreatureModifierNum -= 10;
        }

        if (weaponType.equals(WeaponType.normal)) {
            bigCreatureModifierNum -= 20;
        } else if (weaponType.equals(WeaponType.magic)) {
            bigCreatureModifierNum -= 10;
        } else if (weaponType.equals(WeaponType.mithril)) {
            bigCreatureModifierNum += 0;
        } else if (weaponType.equals(WeaponType.holy)) {
            bigCreatureModifierNum += 10;
        } else if (weaponType.equals(WeaponType.monsterKiller)) {
            bigCreatureModifierNum += 20;
        }

        return bigCreatureModifierNum;
    }
}
