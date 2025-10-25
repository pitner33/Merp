package com.sol.merp.modifiers;

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
public class ExperienceModifiers {
    Double critMultiplyer = 0D;
    Double critModifier = 1D;
    Boolean isTargetAlive = true;
}
