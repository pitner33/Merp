package com.sol.merp.characters;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PenaltyEffect {
    @Column(name = "penalty_value")
    private Integer value; // penalty amount
    @Column(name = "remaining_rounds")
    private Integer remainingRounds; // rounds remaining including current
}
