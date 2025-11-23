package com.sol.merp.characters;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerBonusAdjustmentRepository extends JpaRepository<PlayerBonusAdjustment, Long> {
    List<PlayerBonusAdjustment> findByPlayer_IdOrderByDisplayOrderAsc(Long playerId);
    void deleteByPlayer_Id(Long playerId);
}
