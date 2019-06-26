package com.sol.merp.characters;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
    public void playerActivitySwitch(Player player) {
        if (player.getIsStunned() || isPlayerDead(player)) {
            player.setIsActive(false);
        }
        player.setIsActive(true);

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
        return playerRepository.findAllByIsPlayingIsTrueOrderByIsStunned();
    }
}
//TODO findAll lista MM szerint sorba rendezve a harchoz
//TODO listabn ne legzen benne a halott, kabult
//TODO kulon lista a kabultaknak
//TODO kulon lista a halottaknak
