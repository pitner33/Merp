package com.sol.merp.characters;

import com.sol.merp.attributes.PlayerTarget;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface PlayerService {
    void changeIsPlayStatus(Player player);

    void playerActivitySwitch();

    void doNothingWhenStunned();

    void revivePlayer(Player player);

    Boolean playerDead(Player player);

    Boolean isPlayerHealthBelow50percent(Player player);

    List<Player> adventurersOrderedList();

    void checkIfTargetIsInOrderedList(Player attacker);

    List<Player> activePlayersAsOnAdventureFight();

    void resetActivePlayersBuffer();

    NextTwoPlayersToFigthObject nextPlayersToFight() throws Exception;

    NextTwoPlayersToFigthObject nextPlayersToFight(List<Player> activePlayers) throws Exception;

    List<Player> stunnedPlayers();

    List<Player> deadPlayers();

    List<PlayerTarget> targetablePlayerList();

    Double healthPercent(Player player);

    void refreshAdventurerOrderedListObject(Player defender);

    void checkAndSetStats(Player player);

    void setTbBasedOnAttackType(Player player);

    void playerExperienceCounter(Player player);

    void experienceCounterHPLoss(Integer hpLoss);
    void experienceCounterCrit(String crit);
    void experienceCounterKill();
    void experienceCounterManeuver();
    void experienceCounterMagic();



    Boolean isPlayerFightAlone();

}

//TODO bandage/refresh method a HP/round nullazasra