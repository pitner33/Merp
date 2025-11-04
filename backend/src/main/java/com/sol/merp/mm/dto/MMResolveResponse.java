package com.sol.merp.mm.dto;

public class MMResolveResponse {
    private String resultText;
    private Integer usedRow;
    private Integer usedCol;
    private Boolean failRequired;

    public String getResultText() { return resultText; }
    public void setResultText(String resultText) { this.resultText = resultText; }

    public Integer getUsedRow() { return usedRow; }
    public void setUsedRow(Integer usedRow) { this.usedRow = usedRow; }

    public Integer getUsedCol() { return usedCol; }
    public void setUsedCol(Integer usedCol) { this.usedCol = usedCol; }

    public Boolean getFailRequired() { return failRequired; }
    public void setFailRequired(Boolean failRequired) { this.failRequired = failRequired; }
}
