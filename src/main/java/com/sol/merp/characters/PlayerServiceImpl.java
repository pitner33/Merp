package com.sol.merp.characters;

import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.PlayerTarget;
import com.sol.merp.fight.FightCount;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PlayerServiceImpl implements PlayerService {
    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    FightCount fightCount;

    @Autowired
    PlayerListObject adventurerOrderedListObject;

    @Autowired
    NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject;

    @Override
    public void changeIsPlayStatus(Player player) {
        if (player.getIsPlaying()) {
            player.setIsPlaying(false);
        } else player.setIsPlaying(true);
        playerRepository.save(player);
    }

    @Override
    public void playerActivitySwitch() {
        List<Player> allPlayers = playerRepository.findAll();
        for (Player player : allPlayers) {
            if (player.getIsStunned() || playerDead(player) || player.getPlayerActivity().equals(PlayerActivity._4PrepareMagic) || player.getPlayerActivity().equals(PlayerActivity._5DoNothing)) {
                player.setIsActive(false);

            } else player.setIsActive(true);
            playerRepository.save(player);
        }
    }

    @Override
    public void doNothingWhenStunned() {
        List<Player> allPlayers = playerRepository.findAll();
        for (Player player : allPlayers) {
            if (player.getIsStunned()) {
                player.setPlayerActivity(PlayerActivity._5DoNothing);
                playerRepository.save(player);
            }
        }
    }

    @Override
    public Boolean playerDead(Player player) {
        if (player.getHpActual() <= 0) {
            return true;
        }
        return false;
    }

    @Override
    public Boolean isPlayerHealthBelow50percent(Player player) {
        Double hpActual = player.getHpActual();
        Double hpMax = player.getHpMax();
        Double hpPercent = hpActual / hpMax;
        if (hpPercent <= 0.5) {
            return true;
        }
        return false;
    }

    //get the players who are playing in the adventure and ordered them (dead/stunned/donothindORpreparemagic/mm/activity ORDER from bottom to top
    //put them in a list, wrap it into an object
    //the method is called ONLY at the beginning of a new round
    //during the round after each and every fight defender stats are refreshed in the object!s list KEEPING the order and number of players (void refreshAdventurerOrderedListObject(Player defender))
    @Override
    public List<Player> adventurersOrderedList() {
        List<Player> allWhoPlays = playerRepository.findAllByIsPlayingIsTrue();

        Comparator<Player> orderByIsActiveThenActivityThenMM = Comparator
                .comparing(this::playerDead)
                .thenComparing(Player::getIsStunned).reversed()
                .thenComparing(Player::getIsActive).reversed()
                .thenComparing(Player::getPlayerActivity).reversed()
                .thenComparing(Player::getMm).reversed();
        Collections.sort(allWhoPlays, orderByIsActiveThenActivityThenMM);
        System.out.println(allWhoPlays.toString());
        System.out.println(allWhoPlays.getClass());
        adventurerOrderedListObject.setPlayerList(allWhoPlays);

        adventurerOrderedListObject.getPlayerList().forEach(this::checkIfTargetIsInOrderedList);
        return allWhoPlays;
    }

    //checks if player's target was in ordered list, and if not, set to inactive
    @Override
    public void checkIfTargetIsInOrderedList(Player attacker) {
        Boolean isTargetInOrderedList;

        String targetCharacterId = attacker.getTarget().toString();
        Player target = playerRepository.findByCharacterId(targetCharacterId);

        if (!adventurerOrderedListObject.getPlayerList().contains(target)) {
            attacker.setTarget(PlayerTarget.none);
            attacker.setIsActive(false);
        }
    }

    //picks the next ACTIVE player from ordered list as attacker, and its target, put them into a list and wrap the list into an object
    @Override
    public List<Player> nextPlayersToFight() { //TODO atalakitani hogz nextTwoPlayerObjectet adjon vissza + vegigkovetni a valtozat mashol is
        List<Player> orderedList = adventurerOrderedListObject.getPlayerList();

        fightCount.setFightCountMax(orderedList.size());

        if (fightCount.getFightCount() <= fightCount.getFightCountMax()) {
            Player attacker = orderedList.get(fightCount.getFightCount() - 1);
            while (!attacker.getIsActive()) {
                fightCount.setFightCount(fightCount.getFightCount() + 1);
                if (fightCount.getFightCount() > fightCount.getFightCountMax()) {
                    break;
                }
                attacker = orderedList.get(fightCount.getFightCount() - 1);
            }

            String defenderCharacterId = attacker.getTarget().toString();
            Player defender = playerRepository.findByCharacterId(defenderCharacterId);

            List<Player> nextTwoPLayersToFight = new ArrayList<>();
            nextTwoPLayersToFight.add(attacker);
            nextTwoPLayersToFight.add(defender);

            nextTwoPlayersToFigthObject.setNextTwoPlayersToFight(nextTwoPLayersToFight);

            return nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        } else return nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
    }

    @Override
    public List<Player> stunnedPlayers() {
        return adventurersOrderedList().stream()
                .filter(player -> player.getIsStunned())
                .collect(Collectors.toList());
    }

    @Override
    public List<Player> deadPlayers() {
        return adventurersOrderedList().stream()
                .filter(player -> player.getHpActual() <= 0)
                .collect(Collectors.toList());
    }

    @Override
    public Double healthPercent(Player player) {
        return ((player.getHpActual() / player.getHpMax()) * 100);
    }

    //Refreshing the ordered list object with defendet stats KEEPING the order of the list and the players in it
    //it is used after each and every fight during a round
    @Override
    public void refreshAdventurerOrderedListObject(Player defender) {
        List<Player> newOrderedList = new ArrayList<>();

        checkAndSetStats(defender); // also saves the defender to the repo
        for (int i = 0; i < adventurerOrderedListObject.getPlayerList().size(); i++) {
            if (adventurerOrderedListObject.getPlayerList().get(i).getId().equals(defender.getId())) {
                newOrderedList.add(defender);
            } else newOrderedList.add(adventurerOrderedListObject.getPlayerList().get(i));
        }
        adventurerOrderedListObject.setPlayerList(newOrderedList);
    }

    @Override
    public void checkAndSetStats(Player player) {
        if (!player.getIsAlive()) {
            player.setHpActual(0D);
            player.setIsActive(false);
            player.setIsStunned(false);
            player.setStunnedForRounds(0);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
        }

        if (player.getHpActual() <= 0) {
            player.setHpActual(0D);
            player.setIsAlive(false);
            player.setIsActive(false);
            player.setIsStunned(false);
            player.setStunnedForRounds(0);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
        }

        if (player.getStunnedForRounds() <= 0) {
            player.setStunnedForRounds(0);
            player.setIsStunned(false);
        } else {
            player.setIsStunned(true);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
            player.setIsActive(false);
        }

        if ((player.getPlayerActivity().equals(PlayerActivity._4PrepareMagic)) ||
                player.getPlayerActivity().equals(PlayerActivity._5DoNothing)) {
            player.setIsActive(false);
        } else {
            player.setIsActive(true);
        }

        playerRepository.save(player);
    }

    //Adds experience points after each and every action
    @Override
    public void playerExperienceCounter(Player player) {
//TODO lehet ezt külön methodokba kellene attackresult/death/mm/stb-re
    }
}
