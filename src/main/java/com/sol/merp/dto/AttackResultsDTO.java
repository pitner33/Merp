package com.sol.merp.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

@Component
@Getter
@Setter
public class AttackResultsDTO {
    private String attackResult;
    private Integer baseDamage;
    private String crit;
    private String critResultText;
    private Integer critResultAdditionalDamage;
    private Integer critResultHPLossPerRound;
    private Integer critResultStunnedForRounds;
    private Integer critResultPenaltyOfActions;
    private Integer fullDamageWithoutBleeding;
    private Integer fullDamage;
    private String failResultText;

    public AttackResultsDTO() {
        this.critResultText = "none";
        this.critResultAdditionalDamage = 0;
        this.critResultHPLossPerRound = 0;
        this.critResultStunnedForRounds = 0;
        this.critResultPenaltyOfActions = 0;
        this.failResultText = "none";
    }
}
