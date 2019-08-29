package com.sol.merp.characters;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface PlayerService {
    void changeIsPlayStatus(Player player);

    void playerActivitySwitch();

    void doNothingWhenStunned();

    Boolean playerDead(Player player);

    Boolean isPlayerHealthBelow50percent(Player player);

    List<Player> adventurersOrderedList();

    void checkIfTargetIsInOrderedList(Player attacker);

    List<Player> nextPlayersToFight();

    List<Player> stunnedPlayers();

    List<Player> deadPlayers();

    Double healthPercent(Player player);

    void refreshAdventurerOrderedListObject(Player defender);

    void checkAndSetStats(Player player);

    void playerExperienceCounter(Player player);

}

//TODO bandage/refresh method a HP/round nullazasra