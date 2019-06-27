package com.sol.merp.characters;

import com.sol.merp.attributes.PlayerActivity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Service
public class PlayerServiceImpl implements PlayerService {

    private PlayerRepository playerRepository;

    @Autowired
    public PlayerServiceImpl(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

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
            if (player.getIsStunned() || isPlayerDead(player) || player.getActivity().equals(PlayerActivity._4PrepareMagic) || player.getActivity().equals(PlayerActivity._5DoNothing)) {
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
                player.setActivity(PlayerActivity._5DoNothing);
                playerRepository.save(player);
            }
        }
    }

    @Override
    public Boolean isPlayerDead(Player player) {
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
        playerActivitySwitch();
        doNothingWhenStunned();
        List<Player> allWhoPlays = playerRepository.findAllByIsPlayingIsTrue();

        Comparator<Player> orderByIsActiveThenActivityThenMM = Comparator
                .comparing(Player::getIsActive).reversed()
                .thenComparing(Player::getActivity).reversed()
                .thenComparing(Player::getMm).reversed();
        Collections.sort(allWhoPlays, orderByIsActiveThenActivityThenMM);
        System.out.println(allWhoPlays.toString());
        return allWhoPlays;
    }
}
//TODO findAll lista MM szerint sorba rendezve a harchoz
//TODO listabn ne legzen benne a halott, kabult
//TODO kulon lista a kabultaknak
//TODO kulon lista a halottaknak
