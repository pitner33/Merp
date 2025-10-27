package com.sol.merp.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

@Component
@Getter
@Setter
public class AttackResultsDTO {
    private Integer d100OpenRoll;
    private Integer rollResult;
    private String attackResult;
    private Integer baseDamage;
    private String crit;
    private String critResultText;
    private Integer critResultAdditionalDamage;
    private Integer critResultHPLossPerRound;
    private Integer critResultStunnedForRounds;
    private Integer critResultPenaltyOfActions;
    private Boolean critResultsInstantDeath;
    private Integer fullDamageWithoutBleeding;
    private Integer fullDamage;
    private String failResultText;
    private Integer failResultAdditionalDamage;
    private Integer failResultHPLossPerRound;
    private Integer failResultStunnedForRounds;
    private Integer failResultPenaltyOfActions;
    private Boolean failResultsInstantDeath;

    public AttackResultsDTO() {
        this.critResultText = "none";
        this.critResultAdditionalDamage = 0;
        this.critResultHPLossPerRound = 0;
        this.critResultStunnedForRounds = 0;
        this.critResultPenaltyOfActions = 0;
        this.critResultsInstantDeath = false;
        this.failResultText = "none";
        this.failResultAdditionalDamage = 0;
        this.failResultHPLossPerRound = 0;
        this.failResultStunnedForRounds = 0;
        this.failResultPenaltyOfActions = 0;
        this.failResultsInstantDeath = false;
    }
}
