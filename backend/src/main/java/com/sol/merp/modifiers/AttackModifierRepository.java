package com.sol.merp.modifiers;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttackModifierRepository extends JpaRepository<AttackModifier, Long> {
    Optional<AttackModifier> findByPlayer_Id(Long playerId);
}
