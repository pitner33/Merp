package com.sol.merp.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Component;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Component
public class DiceRollDTO {
    private String roll1;
    private String roll2;
    private String roll3;
    private String roll4;

    public Integer getValueFromDiceRollDTO(DiceRollDTO diceRollDTO) {
        return Integer.parseInt(diceRollDTO.getRoll1()) +
                Integer.parseInt(diceRollDTO.getRoll2()) +
                Integer.parseInt(diceRollDTO.getRoll3()) +
                Integer.parseInt(diceRollDTO.getRoll4());
    }
}
