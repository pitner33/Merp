package com.sol.merp.mm.dto;

public class MMFailResponse {
    private String failResultText;
    private Boolean applied;
    private Integer failResultAdditionalDamage;
    private Integer failResultHPLossPerRound;
    private Integer failResultStunnedForRounds;
    private Integer failResultPenaltyOfActions;
    private Integer failResultPenaltyDurationRounds;
    private Boolean failResultsInstantDeath;

    public String getFailResultText() { return failResultText; }
    public void setFailResultText(String failResultText) { this.failResultText = failResultText; }

    public Boolean getApplied() { return applied; }
    public void setApplied(Boolean applied) { this.applied = applied; }

    public Integer getFailResultAdditionalDamage() { return failResultAdditionalDamage; }
    public void setFailResultAdditionalDamage(Integer failResultAdditionalDamage) { this.failResultAdditionalDamage = failResultAdditionalDamage; }

    public Integer getFailResultHPLossPerRound() { return failResultHPLossPerRound; }
    public void setFailResultHPLossPerRound(Integer failResultHPLossPerRound) { this.failResultHPLossPerRound = failResultHPLossPerRound; }

    public Integer getFailResultStunnedForRounds() { return failResultStunnedForRounds; }
    public void setFailResultStunnedForRounds(Integer failResultStunnedForRounds) { this.failResultStunnedForRounds = failResultStunnedForRounds; }

    public Integer getFailResultPenaltyOfActions() { return failResultPenaltyOfActions; }
    public void setFailResultPenaltyOfActions(Integer failResultPenaltyOfActions) { this.failResultPenaltyOfActions = failResultPenaltyOfActions; }

    public Integer getFailResultPenaltyDurationRounds() { return failResultPenaltyDurationRounds; }
    public void setFailResultPenaltyDurationRounds(Integer failResultPenaltyDurationRounds) { this.failResultPenaltyDurationRounds = failResultPenaltyDurationRounds; }

    public Boolean getFailResultsInstantDeath() { return failResultsInstantDeath; }
    public void setFailResultsInstantDeath(Boolean failResultsInstantDeath) { this.failResultsInstantDeath = failResultsInstantDeath; }
}
