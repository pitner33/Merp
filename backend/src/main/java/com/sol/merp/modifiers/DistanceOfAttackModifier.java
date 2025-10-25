package com.sol.merp.modifiers;

import com.sol.merp.attributes.DistanceOfAttack;
import org.springframework.stereotype.Component;

@Component
public class DistanceOfAttackModifier {

    public Integer countDistanceOfAttackModifier(DistanceOfAttack distanceOfAttack) {
        Integer distanceOfAttackModifierNum = 0;

        if (distanceOfAttack.equals(DistanceOfAttack._0_3m)) {
            distanceOfAttackModifierNum += 35;
        } else if (distanceOfAttack.equals(DistanceOfAttack._3_15m)) {
            distanceOfAttackModifierNum += 0;
        } else if (distanceOfAttack.equals(DistanceOfAttack._15_30m)) {
            distanceOfAttackModifierNum -= 20;
        } else if (distanceOfAttack.equals(DistanceOfAttack._30_60m)) {
            distanceOfAttackModifierNum -= 40;
        } else if (distanceOfAttack.equals(DistanceOfAttack._60_90m)) {
            distanceOfAttackModifierNum -= 55;
        } else if (distanceOfAttack.equals(DistanceOfAttack._90m_plus)) {
            distanceOfAttackModifierNum -= 75;
        }

        return distanceOfAttackModifierNum;
    }
}
