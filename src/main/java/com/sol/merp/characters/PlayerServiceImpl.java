package com.sol.merp.characters;

import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.PlayerTarget;
import com.sol.merp.fight.FightCount;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
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
        for (Player player:allPlayers) {
            if (player.getIsStunned() || playerDead(player) || player.getPlayerActivity().equals(PlayerActivity._4PrepareMagic) || player.getPlayerActivity().equals(PlayerActivity._5DoNothing)) {
                player.setIsActive(false);

            } else player.setIsActive(true);
            playerRepository.save(player);
        }
    }

    @Override
    public void doNothingWhenStunned() {
        List<Player> allPlayers = playerRepository.findAll();
        for (Player player:allPlayers) {
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
        Double hpPercent = hpActual/hpMax;
        if (hpPercent <= 0.5) {
            return true;
        }
        return false;
    }

    @Override
    public List<Player> adventurersOrderedList() {
        //findAllWhoPlays list
        //Comparator isActive --> activity --> MM
        //return
//        playerActivitySwitch(); //Todo Put them back working!!!
//        doNothingWhenStunned();
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
        return allWhoPlays;
    }

    @Override
    public List<Player> nextPlayersToFight() { //TODO atalakitani hogz nextTwoPlayerObjectet adjon vissza + vegigkovetni a valtozat mashol is
        List<Player> orderedList = adventurerOrderedListObject.getPlayerList();
        //TODO mivel itt változik a lista mérete, néha kimarad plazer a támadásból
        // --> megoldani ugyanezt az orderedListtel
        List<Player> allPlayersFightInNextRound = orderedList
                .stream()
                .filter(player -> player.getIsActive())
                .collect(Collectors.toList());

        fightCount.setFightCountMax(allPlayersFightInNextRound.size());

        if (fightCount.getFightCount() <= fightCount.getFightCountMax()) {
            Player attacker = allPlayersFightInNextRound.get(fightCount.getFightCount() - 1);
            if (!attacker.getIsActive()) {
                do {
                    fightCount.setFightCount(fightCount.getFightCount() + 1);
                    attacker = allPlayersFightInNextRound.get(fightCount.getFightCount() - 1);
                } while (!attacker.getIsActive());
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
    public Set<PlayerTarget> targetablePlayers() {
        Set<PlayerTarget> targetablePlayers = new HashSet<>();
        List<Player> orderedList = adventurerOrderedListObject.getPlayerList();
        orderedList.forEach(player -> {
            PlayerTarget playerTarget = player.getTarget();
            targetablePlayers.add(playerTarget);
        });
        return targetablePlayers;
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

//    @Override
//    public void checkAndSetStunnedForRounds(Player player) {
//        if (player.getStunnedForRounds() <= 0) {
//            player.setStunnedForRounds(0);
//            player.setStunned(false);
//        } else {
//            player.setStunned(true);
//            player.setPlayerActivity(PlayerActivity._5DoNothing);
//            player.setIsActive(false);
//        }
//        playerRepository.save(player);
//    }
//
//    @Override
//    public void checkAndSetIsActive(Player player) {
//        if ((player.getHpActual() <= 0) ||
//                (player.getIsStunned()) ||
//                (player.getPlayerActivity().equals(PlayerActivity._5DoNothing)) ||
//                (player.getPlayerActivity().equals(PlayerActivity._4PrepareMagic))) {
//            player.setIsActive(false);
//        } else {
//            player.setIsActive(true);
//        }
//        playerRepository.save(player);
//    }

}
//TODO findAll lista MM szerint sorba rendezve a harchoz
//TODO listabn ne legzen benne a halott, kabult
//TODO kulon lista a kabultaknak
//TODO kulon lista a halottaknak
