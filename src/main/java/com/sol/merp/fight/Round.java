package com.sol.merp.fight;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
public class Round {
    Integer roundCount;

    public Round() {
        this.roundCount = 0;
    }
}


