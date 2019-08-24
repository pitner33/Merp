package com.sol.merp.characters;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface PlayerService {
    void changeIsPlayStatus(Player player);
    void playerActivitySwitch();
    void doNothingWhenStunned();
    Boolean isPlayerDead(Player player);
    Boolean isPlayerHealthBelow50percent(Player player);
    List<Player> adventurersOrderedList();
    List<Player> nextPlayersToFight();
    List<Player> stunnedPlayers();
    List<Player> deadPlayers();
    Double healthPercent(Player player);

}

//TODO bandage method a HP/round nullazasra