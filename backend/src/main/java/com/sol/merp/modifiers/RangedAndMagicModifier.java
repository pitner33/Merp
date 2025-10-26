package com.sol.merp.modifiers;

import com.sol.merp.attributes.PrepareTime;
import com.sol.merp.attributes.DistanceOfAttack;
import org.springframework.stereotype.Component;

@Component
public class RangedAndMagicModifier {
    private PrepareTime prepareTime;
    //TODO atgondolni a fight folyamatot ehhez (is)

    private final DistanceOfAttackModifier distanceOfAttackModifier;

    public RangedAndMagicModifier(DistanceOfAttackModifier distanceOfAttackModifier) {
        this.distanceOfAttackModifier = distanceOfAttackModifier;
    }

    /**
     * Compute total modifier for ranged/magic attack.
     * @param distance distance band (required)
     * @param prepareRounds number of full rounds prepared before attack, allowed 0..4
     * @param coverPenalty movement maneuver (MM) based cover penalty, may be null if no cover
     * @param targetHasShieldInLoS true if target's shield is in LoS. If false (shield NOT in LoS), apply +25.
     * @return total summed modifier
     */
    public int countModifier(DistanceOfAttack distance, Integer prepareRounds, Integer coverPenalty, boolean targetHasShieldInLoS) {
        int total = 0;

        // Distance of attack
        if (distance != null) {
            total += distanceOfAttackModifier.countDistanceOfAttackModifier(distance);
        }

        // Preparation time mapping: 0,1,2,3,4 rounds -> -20,-10,0,10,20
        total += mapPrepareRoundsToModifier(prepareRounds);

        // Cover penalty (MM result from cover resolution)
        if (coverPenalty != null) {
            total += coverPenalty;
        }

        // If shield is NOT in LoS, its usual effect doesn't apply to ranged; grant +25 bonus
        if (!targetHasShieldInLoS) {
            total += 25;
        }

        return total;
    }

    /**
     * Overload using PrepareTime enum for 1..4 rounds. If null, treated as 0 rounds.
     */
    public int countModifier(DistanceOfAttack distance, PrepareTime prepareTimeEnum, Integer coverPenalty, boolean targetHasShieldInLoS) {
        Integer rounds = mapPrepareTimeEnumToRounds(prepareTimeEnum);
        return countModifier(distance, rounds, coverPenalty, targetHasShieldInLoS);
    }

    public int countModifier(
            DistanceOfAttack distance,
            Integer prepareRounds,
            Integer coverPenalty,
            boolean targetHasShieldInLoS,
            boolean targetInMiddleOfMagicBall,
            boolean targetAwareOfAttack,
            boolean targetNotMoving,
            boolean baseMageTypeKapcsolat,
            boolean mdBonus,
            boolean agreeingTarget
    ) {
        int total = countModifier(distance, prepareRounds, coverPenalty, targetHasShieldInLoS);
        if (targetInMiddleOfMagicBall) total += 20;
        if (targetAwareOfAttack) total -= 10;
        if (targetNotMoving) total += 10;
        if (baseMageTypeKapcsolat) total -= 10;
        if (mdBonus) total += 50;
        if (agreeingTarget) total -= 50;
        return total;
    }

    /**
     * Same as above, but allows disabling prepare time contribution entirely.
     */
    public int countModifierWithFlags(
            DistanceOfAttack distance,
            Integer prepareRounds,
            Integer coverPenalty,
            boolean targetHasShieldInLoS,
            boolean applyPrepareTime,
            boolean targetInMiddleOfMagicBall,
            boolean targetAwareOfAttack,
            boolean targetNotMoving,
            boolean baseMageTypeKapcsolat,
            boolean mdBonus,
            boolean agreeingTarget
    ) {
        int total = 0;

        // Distance of attack
        if (distance != null) {
            total += distanceOfAttackModifier.countDistanceOfAttackModifier(distance);
        }

        // Preparation time mapping: only if applyPrepareTime
        if (applyPrepareTime) {
            total += mapPrepareRoundsToModifier(prepareRounds);
        }

        // Cover penalty
        if (coverPenalty != null) {
            total += coverPenalty;
        }

        // Shield in LoS (if NOT in LoS -> +25)
        if (!targetHasShieldInLoS) {
            total += 25;
        }

        if (targetInMiddleOfMagicBall) total += 20;
        if (targetAwareOfAttack) total -= 10;
        if (targetNotMoving) total += 10;
        if (baseMageTypeKapcsolat) total -= 10;
        if (mdBonus) total += 50;
        if (agreeingTarget) total -= 50;
        return total;
    }

    public int countModifier(
            DistanceOfAttack distance,
            PrepareTime prepareTimeEnum,
            Integer coverPenalty,
            boolean targetHasShieldInLoS,
            boolean targetInMiddleOfMagicBall,
            boolean targetAwareOfAttack,
            boolean targetNotMoving,
            boolean baseMageTypeKapcsolat,
            boolean mdBonus,
            boolean agreeingTarget
    ) {
        Integer rounds = mapPrepareTimeEnumToRounds(prepareTimeEnum);
        return countModifier(distance, rounds, coverPenalty, targetHasShieldInLoS, targetInMiddleOfMagicBall, targetAwareOfAttack, targetNotMoving, baseMageTypeKapcsolat, mdBonus, agreeingTarget);
    }

    private int mapPrepareRoundsToModifier(Integer rounds) {
        int r = rounds == null ? 0 : Math.max(0, Math.min(4, rounds));
        switch (r) {
            case 0: return -20;
            case 1: return -10;
            case 2: return 0;
            case 3: return 10;
            case 4: return 20;
            default: return 0;
        }
    }

    private Integer mapPrepareTimeEnumToRounds(PrepareTime pt) {
        if (pt == null) return 0;
        switch (pt) {
            case round1: return 1;
            case round2: return 2;
            case round3: return 3;
            case round4: return 4;
            default: return 0;
        }
    }
}
