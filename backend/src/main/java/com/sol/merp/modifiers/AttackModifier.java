package com.sol.merp.modifiers;

import lombok.*;
import org.springframework.stereotype.Component;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Component
//@Entity
public class AttackModifier{
//    @Id
//    @GeneratedValue(strategy = GenerationType.AUTO)
//    private Long id;
    private Boolean attackFromWeakSide;
    private Boolean attackFromBehind;
    private Boolean defenderSurprised;
    private Boolean defenderStunned;
    private Boolean attackerWeaponChange;
    private Boolean attackerTargetChange;
    private Boolean attackerHPBelow50Percent;
    private Boolean attackerMoreThan3MetersMovement;
    private Integer modifierByGameMaster;

//    public Integer countAttackModifier() {
//        Integer attackModifierNum = 0;
//        if (attackFromWeakSide) {
//            attackModifierNum += 15;
//        }
//        if (attackFromBehind) {
//            attackModifierNum += 20;
//        }
//        if (defenderSurprised) {
//            attackModifierNum += 20;
//        }
//        if (defenderStunned) {
//            attackModifierNum += 20;
//        }
//        if (attackFromWeakSide) {
//            attackModifierNum -= 30;
//        }
//        if (attackerHPBelow50Percent) {
//            attackModifierNum -= 20;
//        }
//        if (attackerMoreThan3MetersMovement) {
//            attackModifierNum -= 10;
//        }
//
//        return attackModifierNum;
//    }

//    public AttackModifier(Boolean attackFromWeakSide,
//                          Boolean attackFromBehind,
//                          Boolean defenderSurprised,
//                          Boolean defenderStunned,
//                          Boolean attackerWeaponChange,
//                          Boolean attackerHPBelow50Percent,
//                          Boolean attackerMoreThan3MetersMovement) {
//        this.attackFromWeakSide = attackFromWeakSide;
//        this.attackFromBehind = attackFromBehind;
//        this.defenderSurprised = defenderSurprised;
//        this.defenderStunned = defenderStunned;
//        this.attackerWeaponChange = attackerWeaponChange;
//        this.attackerHPBelow50Percent = attackerHPBelow50Percent;
//        this.attackerMoreThan3MetersMovement = attackerMoreThan3MetersMovement;
//    }
}
