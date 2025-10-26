package com.sol.merp.modifiers;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface AttackModifierRepository extends JpaRepository<AttackModifier, Long> {
    Optional<AttackModifier> findByPlayer_Id(Long playerId);

    @Modifying
    @Transactional
    @Query("delete from AttackModifier am where am.player.id = :playerId")
    void deleteByPlayerId(@Param("playerId") Long playerId);
}
