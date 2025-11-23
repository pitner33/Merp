package com.sol.merp.characters;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerAttributeTotalRepository extends JpaRepository<PlayerAttributeTotal, Long> {
    List<PlayerAttributeTotal> findByPlayer_Id(Long playerId);
    void deleteByPlayer_Id(Long playerId);
}
