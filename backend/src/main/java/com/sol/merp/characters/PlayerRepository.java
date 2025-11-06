package com.sol.merp.characters;

import com.sol.merp.attributes.PlayerTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findAllByIsPlayingIsTrue();
    Player findByCharacterId(String characterId);
    List<Player> findAllByCharacterIdStartingWith(String prefix);
    Optional<Player> findTopByCharacterIdStartingWithOrderByCharacterIdDesc(String prefix);
}
