package com.sol.merp.characters;

import com.sol.merp.attributes.PlayerTarget;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public interface PlayerService {
    void changeIsPlayStatus(Player player);
    void playerActivitySwitch();
    void doNothingWhenStunned();
    Boolean playerDead(Player player);
    Boolean isPlayerHealthBelow50percent(Player player);
    List<Player> adventurersOrderedList();
    List<Player> nextPlayersToFight();
    Set<PlayerTarget> targetablePlayers();
    List<Player> stunnedPlayers();
    List<Player> deadPlayers();
    Double healthPercent(Player player);
    void checkAndSetStats(Player player);
//    void checkAndSetStunnedForRounds(Player player);
//    void checkAndSetIsActive(Player player);

}

//TODO bandage method a HP/round nullazasra