package com.sol.merp.characters;

import com.sol.merp.attributes.PlayerTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findAllByIsPlayingIsTrue();
    Player findByCharacterId(String characterId);
}
