package com.sol.merp.modifiers;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RangedMagicModifierRepository extends JpaRepository<RangedMagicModifier, Long> {
    Optional<RangedMagicModifier> findByPlayer_Id(Long playerId);
}
