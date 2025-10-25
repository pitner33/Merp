package com.sol.merp.fight;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
public class FightCount {
    Integer fightCount;
    Integer fightCountMax;

    public FightCount() {
        this.fightCount = 0;
        this.fightCountMax = 0;
    }
}
