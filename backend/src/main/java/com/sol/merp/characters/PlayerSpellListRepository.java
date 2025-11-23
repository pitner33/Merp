package com.sol.merp.characters;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerSpellListRepository extends JpaRepository<PlayerSpellList, Long> {
    List<PlayerSpellList> findByPlayer_IdOrderByDisplayOrderAsc(Long playerId);
    void deleteByPlayer_Id(Long playerId);
}
