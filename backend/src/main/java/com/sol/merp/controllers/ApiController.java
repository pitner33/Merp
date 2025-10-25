package com.sol.merp.controllers;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private PlayerService playerService;

    // Players
    @GetMapping("/players")
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    @GetMapping("/players/playing")
    public List<Player> getPlayersWhoPlay() {
        return playerRepository.findAllByIsPlayingIsTrue();
    }

    @GetMapping("/players/{id}")
    public ResponseEntity<Player> getPlayer(@PathVariable Long id) {
        Optional<Player> player = playerRepository.findById(id);
        return player.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/players/{id}")
    public ResponseEntity<Player> updatePlayer(@PathVariable Long id, @RequestBody Player updated) {
        return playerRepository.findById(id)
                .map(existing -> {
                    updated.setId(existing.getId());
                    Player saved = playerRepository.save(updated);
                    playerService.checkAndSetStats(saved);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/players/{id}/isplay")
    public ResponseEntity<Player> toggleIsPlay(@PathVariable Long id) {
        return playerRepository.findById(id)
                .map(player -> {
                    playerService.changeIsPlayStatus(player);
                    return ResponseEntity.ok(player);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/players/{id}/revive")
    public ResponseEntity<Player> revive(@PathVariable Long id) {
        return playerRepository.findById(id)
                .map(player -> {
                    playerService.revivePlayer(player);
                    return ResponseEntity.ok(player);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/players/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!playerRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        playerRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Metadata for enums used in forms
    @GetMapping("/meta/attack-types")
    public List<AttackType> attackTypes() {
        return Arrays.asList(AttackType.values());
    }

    @GetMapping("/meta/crit-types")
    public List<CritType> critTypes() {
        return Arrays.asList(CritType.values());
    }

    @GetMapping("/meta/player-activities")
    public List<PlayerActivity> playerActivities() {
        return Arrays.asList(PlayerActivity.values());
    }
}
