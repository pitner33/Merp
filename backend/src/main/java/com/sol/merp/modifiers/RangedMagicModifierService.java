package com.sol.merp.modifiers;

import com.sol.merp.characters.Player;
import org.springframework.stereotype.Service;

@Service
public interface RangedMagicModifierService {
    int countRangedMagicModifier();
    void setRangedMagicModifierFromPost(RangedMagicModifier incoming);
    void resetRangedMagicModifier();
    RangedMagicModifier getOrCreateFor(Player player);
}
