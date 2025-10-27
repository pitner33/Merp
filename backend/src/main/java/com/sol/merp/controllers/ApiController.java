package com.sol.merp.controllers;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.PlayerTarget;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import com.sol.merp.characters.PlayerListObject;
import com.sol.merp.characters.NextTwoPlayersToFigthObject;
import com.sol.merp.fight.Round;
import com.sol.merp.fight.FightServiceImpl;
import com.sol.merp.modifiers.AttackModifierRepository;
import com.sol.merp.diceRoll.D100Roll;
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
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
@RequestMapping("/api")
public class ApiController {

    private static final Logger log = LoggerFactory.getLogger(ApiController.class);

    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private PlayerService playerService;
    @Autowired
    private AttackModifierRepository attackModifierRepository;
    @Autowired
    private PlayerListObject adventurerOrderedListObject;
    @Autowired
    private NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject;
    @Autowired
    private Round round;
    @Autowired
    private D100Roll d100Roll;

    @Autowired
    private FightServiceImpl fightServiceImpl;

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

    @GetMapping("/dice/d100")
    public Integer rollD100() {
        return d100Roll.d100Random();
    }

    // Compute Modified Roll
    @GetMapping("/fight/compute-modified-roll")
    public ResponseEntity<FightServiceImpl.ModifiedRollResult> computeModifiedRoll(@RequestParam(name = "open") Integer openTotal) {
        if (openTotal == null) {
            return ResponseEntity.badRequest().build();
        }
        FightServiceImpl.ModifiedRollResult res = fightServiceImpl.computeModifiedRoll(openTotal);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/fight/resolve-attack")
    public ResponseEntity<AttackResultResponse> resolveAttack(@RequestParam(name = "total") Integer total) {
        if (total == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.size() < 2) {
            return ResponseEntity.badRequest().build();
        }
        Player attacker = pair.get(0);
        Player defender = pair.get(1);

        log.info("RESOLVE: attacker.id={} attacker.attackType={} defender.id={} defender.armorType={} inputTotal={}",
                attacker != null ? attacker.getId() : null,
                attacker != null ? attacker.getAttackType() : null,
                defender != null ? defender.getId() : null,
                defender != null ? defender.getArmorType() : null,
                total);

        List<String> row = fightServiceImpl.getAttackResultRowByAttackType(attacker, total);
        if (row == null) {
            log.warn("RESOLVE: GS row is null for attackType={} total={} (after internal clamping)",
                    attacker != null ? attacker.getAttackType() : null, total);
            return ResponseEntity.badRequest().build();
        }
        if (row.size() < 5) {
            log.warn("RESOLVE: GS row has insufficient columns size={} for attackType={} total={}", row.size(),
                    attacker != null ? attacker.getAttackType() : null, total);
            return ResponseEntity.badRequest().build();
        }

        String result = fightServiceImpl.getAttackResultFromRowByDefenderArmor(row, defender);
        log.info("RESOLVE: result={} row[0..4]={}", result, row.subList(0, 5));

        AttackResultResponse resp = new AttackResultResponse();
        resp.setResult(result);
        resp.setRow(row);
        resp.setTotal(total);
        return ResponseEntity.ok(resp);
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

            // Normalize fields to satisfy DB CHECK constraints before persisting
            // 1) TB used for defense: [0, tb/2], and if TB < 0 -> 0 immediately
            Integer tbUsed = incoming.getTbUsedForDefense();
            if (tbUsed == null) tbUsed = 0;
            if (tbUsed < 0) tbUsed = 0;
            Integer tbVal = incoming.getTb();
            int maxDef = (tbVal != null ? tbVal : 0) / 2;
            if (tbVal != null && tbVal < 0) {
                tbUsed = 0;
            } else {
                if (maxDef < 0) maxDef = 0;
                if (tbUsed > maxDef) tbUsed = maxDef;
            }
            incoming.setTbUsedForDefense(tbUsed);

            // 2) HP actual range and alive flags
            Double hpAct = incoming.getHpActual();
            Double hpMax = incoming.getHpMax();
            if (hpAct == null) hpAct = 0D;
            if (hpAct < 0D) hpAct = 0D;
            if (hpMax != null && hpAct > hpMax) hpAct = hpMax;
            incoming.setHpActual(hpAct);

            if (hpAct <= 0D) {
                incoming.setIsAlive(false);
                incoming.setIsActive(false);
                incoming.setIsStunned(false);
                incoming.setStunnedForRounds(0);
                incoming.setPlayerActivity(PlayerActivity._5DoNothing);
            }

            // 3) Non-negative counters
            if (incoming.getStunnedForRounds() == null || incoming.getStunnedForRounds() < 0)
                incoming.setStunnedForRounds(0);
            if (incoming.getPenaltyOfActions() == null || incoming.getPenaltyOfActions() < 0)
                incoming.setPenaltyOfActions(0);
            if (incoming.getHpLossPerRound() == null || incoming.getHpLossPerRound() < 0)
                incoming.setHpLossPerRound(0);

            // 3/b) Clamp detailed TBs to non-negative (schema may enforce >= 0)
            if (incoming.getTbOneHanded() == null || incoming.getTbOneHanded() < 0) incoming.setTbOneHanded(0);
            if (incoming.getTbTwoHanded() == null || incoming.getTbTwoHanded() < 0) incoming.setTbTwoHanded(0);
            if (incoming.getTbRanged() == null || incoming.getTbRanged() < 0) incoming.setTbRanged(0);
            if (incoming.getTbBaseMagic() == null || incoming.getTbBaseMagic() < 0) incoming.setTbBaseMagic(0);
            if (incoming.getTbTargetMagic() == null || incoming.getTbTargetMagic() < 0) incoming.setTbTargetMagic(0);

            // 4) Derive isActive from activity if alive
            if (Boolean.TRUE.equals(incoming.getIsAlive())) {
                boolean notActing = incoming.getPlayerActivity() == PlayerActivity._4PrepareMagic ||
                        incoming.getPlayerActivity() == PlayerActivity._5DoNothing;
                if (notActing) {
                    incoming.setIsActive(false);
                    // When not acting: enforce neutral combat state
                    incoming.setAttackType(AttackType.none);
                    incoming.setTarget(PlayerTarget.none);
                    incoming.setTb(0);
                } else {
                    incoming.setIsActive(true);
                }
            }
            // If attack type is none, enforce neutral combat state
            if (incoming.getAttackType() == AttackType.none) {
                incoming.setTarget(PlayerTarget.none);
                incoming.setTb(0);
                incoming.setTbUsedForDefense(0);
            }
            // Coerce null enums to 'none' to satisfy NOT NULL/CHECKs
            if (incoming.getAttackType() == null) incoming.setAttackType(AttackType.none);
            if (incoming.getCritType() == null) incoming.setCritType(CritType.none);
            if (incoming.getArmorType() == null) incoming.setArmorType(com.sol.merp.attributes.ArmorType.none);
            try {
                // Apply only normalized fields onto the existing entity to avoid violating unrelated constraints
                boolean incomingNeutral = incoming.getPlayerActivity() == PlayerActivity._4PrepareMagic ||
                        incoming.getPlayerActivity() == PlayerActivity._5DoNothing;
                boolean existingNeutral = existing.getPlayerActivity() == PlayerActivity._4PrepareMagic ||
                        existing.getPlayerActivity() == PlayerActivity._5DoNothing;

                // Apply incoming core combat fields
                existing.setPlayerActivity(incoming.getPlayerActivity());
                existing.setAttackType(incoming.getAttackType());
                existing.setCritType(incoming.getCritType());
                existing.setArmorType(incoming.getArmorType());
                existing.setTarget(incoming.getTarget());
                existing.setShield(incoming.getShield());
                existing.setTb(incoming.getTb());
                existing.setTbUsedForDefense(incoming.getTbUsedForDefense());
                // HP may change alive state; set here and let service derive status safely
                if (incoming.getHpActual() != null) existing.setHpActual(incoming.getHpActual());

                // Minimal pre-derivations to satisfy invariants before service derivation
                if (existing.getTarget() == PlayerTarget.none) {
                    existing.setPlayerActivity(PlayerActivity._5DoNothing);
                }
                if (existing.getPlayerActivity() == PlayerActivity._5DoNothing) {
                    existing.setAttackType(AttackType.none);
                    existing.setCritType(CritType.none);
                }

                // Let the domain service finalize invariants and persist (it calls repository.save)
                playerService.checkAndSetStats(existing);
                saved.add(existing);
                log.info("Updated player id={} characterId={} tb={}", existing.getId(), existing.getCharacterId(), existing.getTb());
            } catch (Exception ex) {
                notFound.add(incoming.getId());
                log.warn("bulk-update failed for id={} charId={} with ex: {}. Fields: atkType={} crit={} armor={} target={} hpAct={} hpMax={} tb={} tbUsedDef={} act={} alive={} active={}",
                        incoming.getId(), incoming.getCharacterId(), ex.toString(),
                        incoming.getAttackType(), incoming.getCritType(), incoming.getArmorType(), incoming.getTarget(),
                        incoming.getHpActual(), incoming.getHpMax(), incoming.getTb(), incoming.getTbUsedForDefense(),
                        incoming.getPlayerActivity(), incoming.getIsAlive(), incoming.getIsActive());
                try {
                    Optional<Player> exOpt = playerRepository.findById(incoming.getId());
                    if (exOpt.isPresent()) {
                        Player e = exOpt.get();
                        log.warn("existing row snapshot id={} isPlaying={} isActive={} isAlive={} activity={} atkType={} crit={} target={} tb={} tbUsedDef={} hpAct={} hpMax={} penaltyOfActions={} stunned={} stunnedRounds={} armor={}",
                                e.getId(), e.getIsPlaying(), e.getIsActive(), e.getIsAlive(), e.getPlayerActivity(), e.getAttackType(), e.getCritType(), e.getTarget(), e.getTb(), e.getTbUsedForDefense(), e.getHpActual(), e.getHpMax(), e.getPenaltyOfActions(), e.getIsStunned(), e.getStunnedForRounds(), e.getArmorType());
                    }
                } catch (Exception ignore) {}
            }
        }

        log.info("bulk-update finished: saved={}, notFound={}", saved.size(), notFound.size());
        return ResponseEntity.ok(new BulkUpdateResult(saved, notFound));
    }

    // Fight flow
    @GetMapping("/fight/round-count")
    public ResponseEntity<Integer> getRoundCount() {
        return ResponseEntity.ok(round.getRoundCount());
    }

    @PostMapping("/fight/reset-round-count")
    public ResponseEntity<Integer> resetRoundCount() {
        round.setRoundCount(0);
        return ResponseEntity.ok(round.getRoundCount());
    }

    @PostMapping("/fight/start-round")
    public ResponseEntity<NextTwoPlayersToFigthObject> startRound() throws Exception {
        playerService.resetActivePlayersBuffer();
        // Ensure backend state reflects latest statuses before selecting next players
        playerService.playerActivitySwitch();
        playerService.doNothingWhenStunned();
        playerService.adventurersOrderedList();
        // increment round counter on new round start
        round.setRoundCount(round.getRoundCount() + 1);
        NextTwoPlayersToFigthObject result = playerService.nextPlayersToFight();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/fight/next-round")
    public ResponseEntity<NextTwoPlayersToFigthObject> startNextRound() throws Exception {
        NextTwoPlayersToFigthObject result = playerService.nextPlayersToFight();
        return ResponseEntity.ok(result);
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

    public static class AttackResultResponse {
        private String result;
        private List<String> row;
        private Integer total;

        public String getResult() { return result; }
        public void setResult(String result) { this.result = result; }
        public List<String> getRow() { return row; }
        public void setRow(List<String> row) { this.row = row; }
        public Integer getTotal() { return total; }
        public void setTotal(Integer total) { this.total = total; }
    }
}
