package com.sol.merp.controllers;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import com.sol.merp.modifiers.AttackModifierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api")
public class ApiController {

    private static final Logger log = LoggerFactory.getLogger(ApiController.class);

    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private PlayerService playerService;
    @Autowired
    private AttackModifierRepository attackModifierRepository;

    // Players
    @GetMapping("/players")
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    @GetMapping("/players/playing")
    public List<Player> getPlayersWhoPlay() {
        return playerRepository.findAllByIsPlayingIsTrue();
    }

    @GetMapping("/players/ordered")
    public List<Player> getOrderedPlayersWhoPlay() {
        return playerService.adventurersOrderedList();
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
        // First delete dependent rows, then the player to satisfy FK constraints
        attackModifierRepository.deleteByPlayerId(id);
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

    // Bulk update players from the Adventure page
    @PostMapping("/players/bulk-update")
    @Transactional
    public ResponseEntity<BulkUpdateResult> bulkUpdatePlayers(@RequestBody List<Player> updates) {
        List<Player> saved = new ArrayList<>();
        List<Long> notFound = new ArrayList<>();

        if (updates == null || updates.isEmpty()) {
            log.info("bulk-update called with empty payload");
            return ResponseEntity.ok(new BulkUpdateResult(saved, notFound));
        }

        for (Player incoming : updates) {
            if (incoming.getId() == null) {
                // Cannot update without an ID
                log.warn("Skipping update without ID for characterId={}", incoming.getCharacterId());
                continue;
            }
            Optional<Player> existingOpt = playerRepository.findById(incoming.getId());
            if (existingOpt.isEmpty()) {
                notFound.add(incoming.getId());
                log.warn("Player not found id={} (characterId={})", incoming.getId(), incoming.getCharacterId());
                continue;
            }
            Player existing = existingOpt.get();

            // Ensure we update the existing entity (avoid accidental create)
            incoming.setId(existing.getId());

            // Compute and set main TB column based on current attack type and detailed TB fields
            Integer computedTb = computeTb(incoming);
            incoming.setTb(computedTb);

            Player persisted = playerRepository.saveAndFlush(incoming);
            playerService.checkAndSetStats(persisted);
            saved.add(persisted);
            log.info("Updated player id={} characterId={} tb={}", persisted.getId(), persisted.getCharacterId(), persisted.getTb());
        }

        log.info("bulk-update finished: saved={}, notFound={}", saved.size(), notFound.size());
        return ResponseEntity.ok(new BulkUpdateResult(saved, notFound));
    }

    private Integer computeTb(Player p) {
        if (p == null || p.getAttackType() == null) return p != null ? p.getTb() : null;
        switch (p.getAttackType()) {
            case slashing:
            case blunt:
            case clawsAndFangs:
            case grabOrBalance:
                return p.getTbOneHanded();
            case twoHanded:
                return p.getTbTwoHanded();
            case ranged:
                return p.getTbRanged();
            case baseMagic:
                return p.getTbBaseMagic();
            case magicBall:
            case magicProjectile:
                return p.getTbTargetMagic();
            default:
                return p.getTb();
        }
    }

    public static class BulkUpdateResult {
        private List<Player> saved;
        private List<Long> notFound;

        public BulkUpdateResult() {}

        public BulkUpdateResult(List<Player> saved, List<Long> notFound) {
            this.saved = saved;
            this.notFound = notFound;
        }

        public List<Player> getSaved() {
            return saved;
        }

        public void setSaved(List<Player> saved) {
            this.saved = saved;
        }

        public List<Long> getNotFound() {
            return notFound;
        }

        public void setNotFound(List<Long> notFound) {
            this.notFound = notFound;
        }
    }
}
