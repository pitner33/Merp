package com.sol.merp.modifiers;

import com.sol.merp.characters.NextTwoPlayersToFigthObject;
import org.springframework.stereotype.Service;

@Service
public interface AttackModifierService {
    Integer countAttackModifier();
    void setAttackModifierFromPostMethod(AttackModifier attackModifierFromPost);
    void resetAttackmodifier();

}
