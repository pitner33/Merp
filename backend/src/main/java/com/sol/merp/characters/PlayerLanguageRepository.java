package com.sol.merp.characters;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerLanguageRepository extends JpaRepository<PlayerLanguage, Long> {
    List<PlayerLanguage> findByPlayer_IdOrderByDisplayOrderAsc(Long playerId);
    void deleteByPlayer_Id(Long playerId);
}
