package com.sol.merp.controllers;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.ArmorType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.Gender;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.PlayerClass;
import com.sol.merp.attributes.PlayerTarget;
import com.sol.merp.attributes.Race;
import com.sol.merp.attributes.WeaponSpecType;
import com.sol.merp.attributes.WeaponType;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerListObject;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import com.sol.merp.characters.NextTwoPlayersToFigthObject;
import com.sol.merp.fight.Round;
import com.sol.merp.fight.FightServiceImpl;
import com.sol.merp.fight.DualWieldCalculator;
import com.sol.merp.charactercreation.EarlyYearsProfileService;
import com.sol.merp.dto.AttackResultsDTO;
import com.sol.merp.dto.EarlyYearsProfileDto;
import com.sol.merp.modifiers.AttackModifierRepository;
import com.sol.merp.diceRoll.D100Roll;
import com.sol.merp.inventory.InventoryService;
import com.sol.merp.inventory.PlayerInventoryItem;
import com.sol.merp.weapons.Weapon;
import com.sol.merp.weapons.WeaponRepository;
import com.sol.merp.storage.ChildhoodSkillPresetService;
import com.sol.merp.storage.ClassSkillBonusService;
import com.sol.merp.storage.NormalBonusService;
import com.sol.merp.storage.RaceBonusService;
import com.sol.merp.storage.SkillLevelBonusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.concurrent.ThreadLocalRandom;
import java.util.Map;

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

    @Autowired
    private WeaponRepository weaponRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private NormalBonusService normalBonusService;

    @Autowired
    private RaceBonusService raceBonusService;
    @Autowired
    private SkillLevelBonusService skillLevelBonusService;
    @Autowired
    private ChildhoodSkillPresetService childhoodSkillPresetService;
    @Autowired
    private ClassSkillBonusService classSkillBonusService;

    @Autowired
    private EarlyYearsProfileService earlyYearsProfileService;

    // Players
    @GetMapping("/players")
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    @GetMapping("/players/{playerId}/early-years")
    public ResponseEntity<EarlyYearsProfileDto> getEarlyYearsProfile(@PathVariable Long playerId) {
        try {
            EarlyYearsProfileDto dto = earlyYearsProfileService.loadProfile(playerId);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception ex) {
            log.warn("Failed to load Early Years profile for player {} -> {}", playerId, ex.toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/players/{playerId}/early-years")
    public ResponseEntity<EarlyYearsProfileDto> saveEarlyYearsProfile(@PathVariable Long playerId,
                                                                      @RequestBody EarlyYearsProfileDto payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            EarlyYearsProfileDto saved = earlyYearsProfileService.saveProfile(playerId, payload);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception ex) {
            log.warn("Failed to save Early Years profile for player {} -> {}", playerId, ex.toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/attributes/normal-bonuses")
    public Map<String, Integer> getNormalBonuses() {
        return normalBonusService.getNormalBonuses();
    }

    @GetMapping("/attributes/normal-bonuses/{value}")
    public ResponseEntity<Integer> getNormalBonusByValue(@PathVariable("value") int attributeValue) {
        if (attributeValue <= 0) {
            return ResponseEntity.badRequest().build();
        }
        OptionalInt result = normalBonusService.findNormalBonusForValue(attributeValue);
        if (result.isPresent()) {
            return ResponseEntity.ok(result.getAsInt());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @GetMapping("/attributes/mana-bonuses/{value}")
    public ResponseEntity<Integer> getManaBonusByValue(@PathVariable("value") int attributeValue) {
        if (attributeValue <= 0) {
            return ResponseEntity.badRequest().build();
        }
        OptionalInt result = normalBonusService.findManaBonusForValue(attributeValue);
        if (result.isPresent()) {
            return ResponseEntity.ok(result.getAsInt());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @GetMapping("/attributes/childhood-skills/{raceKey}")
    public ResponseEntity<Map<String, Integer>> getChildhoodSkills(@PathVariable("raceKey") String raceKey) {
        if (raceKey == null || raceKey.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Optional<Map<String, Integer>> byEnum = resolveRace(raceKey)
                .flatMap(childhoodSkillPresetService::findChildhoodSkills);
        if (byEnum.isPresent()) {
            return ResponseEntity.ok(byEnum.get());
        }

        Optional<Map<String, Integer>> byKey = childhoodSkillPresetService.findChildhoodSkillsByKey(raceKey);
        return byKey.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/attributes/class-bonuses/{classKey}")
    public ResponseEntity<Map<String, Integer>> getClassBonuses(@PathVariable("classKey") String classKey) {
        if (classKey == null || classKey.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Optional<Map<String, Integer>> byEnum = resolvePlayerClass(classKey)
                .flatMap(classSkillBonusService::findClassBonuses);
        if (byEnum.isPresent()) {
            return ResponseEntity.ok(byEnum.get());
        }

        Optional<Map<String, Integer>> byKey = classSkillBonusService.findClassBonusesByKey(classKey);
        return byKey.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/attributes/race-bonuses/{raceKey}")
    public ResponseEntity<Map<String, Integer>> getRaceBonuses(@PathVariable("raceKey") String raceKey) {
        if (raceKey == null || raceKey.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Optional<Map<String, Integer>> byEnum = resolveRace(raceKey)
                .flatMap(raceBonusService::findRaceBonuses);
        if (byEnum.isPresent()) {
            return ResponseEntity.ok(byEnum.get());
        }

        Optional<Map<String, Integer>> byKey = raceBonusService.findRaceBonusesByKey(raceKey);
        return byKey.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/skills/level-bonus")
    public ResponseEntity<Integer> getSkillLevelBonus(
            @RequestParam("skillName") String skillName,
            @RequestParam("levels") int levelCount) {
        if (skillName == null || skillName.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Optional<Integer> result = skillLevelBonusService.findSkillLevelBonus(skillName, levelCount);
        if (result.isPresent()) {
            return ResponseEntity.ok(result.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    private Optional<Race> resolveRace(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String normalized = raw.trim();
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        for (Race candidate : Race.values()) {
            if (candidate.name().equalsIgnoreCase(normalized)) {
                return Optional.of(candidate);
            }
            String display = candidate.getDisplayName();
            if (display != null && display.equalsIgnoreCase(normalized)) {
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }

    private Optional<PlayerClass> resolvePlayerClass(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String normalized = raw.trim();
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        for (PlayerClass candidate : PlayerClass.values()) {
            if (candidate.name().equalsIgnoreCase(normalized)) {
                return Optional.of(candidate);
            }
            String display = candidate.getDisplayName();
            if (display != null && display.equalsIgnoreCase(normalized)) {
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }

    public static class InventoryRequest {
        private List<Long> weaponIds;

        public List<Long> getWeaponIds() {
            return weaponIds;
        }

        public void setWeaponIds(List<Long> weaponIds) {
            this.weaponIds = weaponIds;
        }
    }

    public static class RaceOption {
        private String code;
        private String displayName;

        public RaceOption() {}

        public RaceOption(String code, String displayName) {
            this.code = code;
            this.displayName = displayName;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }
    }

    @PostMapping("/weapons")
    public ResponseEntity<Weapon> createWeapon(@RequestBody Weapon incoming) {
        if (incoming == null) {
            return ResponseEntity.badRequest().build();
        }

        String name = incoming.getName();
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String normalizedName = name.trim();
        if (weaponRepository.findByName(normalizedName).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        incoming.setId(null);
        incoming.setName(normalizedName);

        if (incoming.getActivityType() == null) incoming.setActivityType(PlayerActivity._5DoNothing);
        if (incoming.getAttackType() == null) incoming.setAttackType(AttackType.none);
        if (incoming.getCritType() == null) incoming.setCritType(CritType.none);
        if (incoming.getSecondaryCritType() == null) incoming.setSecondaryCritType(CritType.none);
        if (incoming.getWeaponType() == null) incoming.setWeaponType(WeaponType.none);
        if (incoming.getWeaponSpecType() == null) incoming.setWeaponSpecType(WeaponSpecType.none);
        if (incoming.getExtraTBMH() == null) incoming.setExtraTBMH(0);
        if (incoming.getExtraTBOH() == null) incoming.setExtraTBOH(0);
        if (incoming.getRollCapMH() == null) incoming.setRollCapMH(150);
        if (incoming.getRollCapOH() == null) incoming.setRollCapOH(150);
        if (incoming.getCritCapMH() == null) incoming.setCritCapMH("");
        if (incoming.getCritCapOH() == null) incoming.setCritCapOH("");
        if (incoming.getSpecialModofierTB() == null) incoming.setSpecialModofierTB(0);
        if (incoming.getWeight() == null) incoming.setWeight(0D);

        try {
            Weapon saved = weaponRepository.save(incoming);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception ex) {
            log.warn("Failed to create weapon name={} -> {}", normalizedName, ex.toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/players/playing")
    public List<Player> getPlayersWhoPlay() {
        return playerRepository.findAllByIsPlayingIsTrue();
    }

    @GetMapping("/players/ordered")
    public List<Player> getOrderedPlayersWhoPlay() {
        return playerService.adventurersOrderedList();
    }

    @GetMapping("/weapons")
    public List<Weapon> getWeapons() {
        return weaponRepository.findAll();
    }

    @GetMapping("/players/{id}/inventory")
    public ResponseEntity<List<PlayerInventoryItem>> getPlayerInventory(@PathVariable Long id) {
        if (!playerRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        inventoryService.ensureDefaultWeaponsForPlayer(id);
        List<PlayerInventoryItem> inventory = inventoryService.getInventoryForPlayer(id);
        return ResponseEntity.ok(inventory);
    }

    @PostMapping("/players/{id}/inventory")
    public ResponseEntity<List<PlayerInventoryItem>> addWeaponsToInventory(
            @PathVariable Long id,
            @RequestBody InventoryRequest request) {
        if (request == null || request.getWeaponIds() == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            List<PlayerInventoryItem> updated = inventoryService.addWeaponsToPlayer(id, request.getWeaponIds());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    @DeleteMapping("/players/{id}/inventory/{weaponId}")
    public ResponseEntity<Void> removeWeaponFromInventory(@PathVariable Long id, @PathVariable Long weaponId) {
        try {
            inventoryService.removeWeaponFromPlayer(id, weaponId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    @PostMapping("/players")
    public ResponseEntity<Player> createPlayer(@RequestBody Player incoming) {
        if (incoming == null) {
            return ResponseEntity.badRequest().build();
        }
        if (incoming.getCharacterId() == null || incoming.getCharacterId().isBlank()) {
            return ResponseEntity.badRequest().body(null);
        }

        String allocatedCharacterId = allocateCharacterId(incoming.getCharacterId());
        if (allocatedCharacterId == null) {
            return ResponseEntity.badRequest().body(null);
        }

        incoming.setCharacterId(allocatedCharacterId);
        if (incoming.getName() == null || incoming.getName().isBlank()) {
            return ResponseEntity.badRequest().body(null);
        }

        incoming.setId(null);

        if (incoming.getActivePenaltyEffects() == null) {
            incoming.setActivePenaltyEffects(new ArrayList<>());
        }

        if (incoming.getIsPlaying() == null) incoming.setIsPlaying(false);
        if (incoming.getIsAlive() == null) incoming.setIsAlive(true);
        if (incoming.getIsActive() == null) incoming.setIsActive(true);
        if (incoming.getIsStunned() == null) incoming.setIsStunned(false);
        if (incoming.getShield() == null) incoming.setShield(false);

        if (incoming.getPlayerActivity() == null) incoming.setPlayerActivity(PlayerActivity._5DoNothing);
        if (incoming.getAttackType() == null) incoming.setAttackType(AttackType.none);
        if (incoming.getCritType() == null) incoming.setCritType(CritType.none);
        if (incoming.getArmorType() == null) incoming.setArmorType(ArmorType.none);
        if (incoming.getTarget() == null) incoming.setTarget(PlayerTarget.none);

        if (incoming.getLvl() == null) incoming.setLvl(1);
        if (incoming.getXp() == null) {
            incoming.setXp(Player.getLevelCap(incoming.getLvl()));
        }
        if (incoming.getHpMax() == null) incoming.setHpMax(0D);
        if (incoming.getHpActual() == null) incoming.setHpActual(incoming.getHpMax());
        if (incoming.getMm() == null) incoming.setMm(0);
        if (incoming.getMmNone() == null) incoming.setMmNone(0);
        if (incoming.getMmLeather() == null) incoming.setMmLeather(0);
        if (incoming.getMmHeavyLeather() == null) incoming.setMmHeavyLeather(0);
        if (incoming.getMmChainmail() == null) incoming.setMmChainmail(0);
        if (incoming.getMmPlate() == null) incoming.setMmPlate(0);
        if (incoming.getTbUsedForDefense() == null) incoming.setTbUsedForDefense(0);
        if (incoming.getTb1HSlashing() == null) incoming.setTb1HSlashing(0);
        if (incoming.getTb1HBlunt() == null) incoming.setTb1HBlunt(0);
        if (incoming.getTbTwoHanded() == null) incoming.setTbTwoHanded(0);
        if (incoming.getTbRanged() == null) incoming.setTbRanged(0);
        if (incoming.getTbBaseMagic() == null) incoming.setTbBaseMagic(0);
        if (incoming.getTbTargetMagic() == null) incoming.setTbTargetMagic(0);
        if (incoming.getTbOffHand() == null) incoming.setTbOffHand(0);
        if (incoming.getDualWield() == null) incoming.setDualWield(0);
        if (incoming.getVb() == null) incoming.setVb(0);
        if (incoming.getAgilityBonus() == null) incoming.setAgilityBonus(0);
        if (incoming.getMdLenyeg() == null) incoming.setMdLenyeg(0);
        if (incoming.getMdKapcsolat() == null) incoming.setMdKapcsolat(0);
        if (incoming.getTotalManaBonus() == null) incoming.setTotalManaBonus(0);
        if (incoming.getTotalPoisonMdBonus() == null) incoming.setTotalPoisonMdBonus(0);
        if (incoming.getTotalDiseaseMdBonus() == null) incoming.setTotalDiseaseMdBonus(0);
        if (incoming.getStunnedForRounds() == null || incoming.getStunnedForRounds() < 0) incoming.setStunnedForRounds(0);
        if (incoming.getHpLossPerRound() == null || incoming.getHpLossPerRound() < 0) incoming.setHpLossPerRound(0);
        if (incoming.getPenaltyOfActions() == null) incoming.setPenaltyOfActions(0);
        if (incoming.getPerception() == null) incoming.setPerception(0);
        if (incoming.getTracking() == null) incoming.setTracking(0);
        if (incoming.getLockPicking() == null) incoming.setLockPicking(0);
        if (incoming.getDisarmTraps() == null) incoming.setDisarmTraps(0);
        if (incoming.getObjectUsage() == null) incoming.setObjectUsage(0);
        if (incoming.getRunes() == null) incoming.setRunes(0);
        if (incoming.getInfluence() == null) incoming.setInfluence(0);
        if (incoming.getStealth() == null) incoming.setStealth(0);
        if (incoming.getClimbing() == null) incoming.setClimbing(0);
        if (incoming.getRiding() == null) incoming.setRiding(0);
        if (incoming.getSwimming() == null) incoming.setSwimming(0);
        if (incoming.getBackstab() == null) incoming.setBackstab(0);
        if (incoming.getAcrobatics() == null) incoming.setAcrobatics(0);
        if (incoming.getShips() == null) incoming.setShips(0);
        if (incoming.getCaving() == null) incoming.setCaving(0);
        if (incoming.getFirstAid() == null) incoming.setFirstAid(0);
        if (incoming.getCooking() == null) incoming.setCooking(0);
        if (incoming.getRopes() == null) incoming.setRopes(0);

        Double hpAct = incoming.getHpActual();
        Double hpMax = incoming.getHpMax();
        if (hpAct == null) hpAct = 0D;
        if (hpAct < 0D) hpAct = 0D;
        if (hpMax != null && hpAct > hpMax) hpAct = hpMax;
        incoming.setHpActual(hpAct);

        Weapon equippedWeapon = null;
        Long equippedWeaponId = incoming.getEquippedWeaponId();
        if (equippedWeaponId != null) {
            Optional<Weapon> weaponOpt = weaponRepository.findById(equippedWeaponId);
            if (weaponOpt.isPresent()) {
                equippedWeapon = weaponOpt.get();
            } else {
                log.warn("Equipped weapon id={} not found during creation for characterId={}; clearing reference", equippedWeaponId, incoming.getCharacterId());
                incoming.setEquippedWeaponId(null);
            }
        }

        Integer computedTb = computeTb(incoming, equippedWeapon);
        incoming.setTb(computedTb);

        Integer tbUsed = incoming.getTbUsedForDefense();
        if (tbUsed == null) tbUsed = 0;
        if (tbUsed < 0) tbUsed = 0;
        int maxDef = (incoming.getTb() != null ? incoming.getTb() : 0) / 2;
        if (maxDef < 0) maxDef = 0;
        if (tbUsed > maxDef) tbUsed = maxDef;
        incoming.setTbUsedForDefense(tbUsed);

        try {
            Player saved = playerRepository.save(incoming);
            playerService.checkAndSetStats(saved);
            Player normalized = playerRepository.findById(saved.getId()).orElse(saved);
            inventoryService.ensureDefaultWeaponsForPlayer(normalized.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(normalized);
        } catch (Exception ex) {
            log.warn("Failed to create player charId={} name={} -> {}", incoming.getCharacterId(), incoming.getName(), ex.toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String allocateCharacterId(String rawPrefix) {
        if (rawPrefix == null) {
            return null;
        }
        String prefix = rawPrefix.trim().toUpperCase();
        if (prefix.isEmpty()) {
            return null;
        }

        List<Player> matches = playerRepository.findAllByCharacterIdStartingWith(prefix);
        int[] maxAndWidth = matches.stream()
                .map(Player::getCharacterId)
                .filter(Objects::nonNull)
                .map(id -> id.trim())
                .filter(id -> id.length() >= prefix.length())
                .map(id -> id.substring(0, prefix.length()).equalsIgnoreCase(prefix) ? id.substring(prefix.length()) : null)
                .filter(Objects::nonNull)
                .map(part -> part.trim())
                .filter(part -> !part.isEmpty())
                .map(part -> part.matches("\\d+") ? part : null)
                .filter(Objects::nonNull)
                .map(part -> new int[] { Integer.parseInt(part), part.length() })
                .reduce(new int[] { 0, 2 }, (acc, curr) -> {
                    if (curr[0] > acc[0]) {
                        return new int[] { curr[0], Math.max(curr[1], acc[1]) };
                    }
                    return new int[] { acc[0], Math.max(curr[1], acc[1]) };
                });

        int maxSuffix = maxAndWidth[0];
        int width = Math.max(2, maxAndWidth[1]);
        int next = Math.max(1, maxSuffix + 1);
        String formatted = String.format("%0" + width + "d", next);
        return prefix + formatted;
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

    @GetMapping("/dice/d10")
    public Integer rollD10() {
        return ThreadLocalRandom.current().nextInt(1, 11);
    }

    // Compute Modified Roll
    @GetMapping("/fight/compute-modified-roll")
    public ResponseEntity<FightServiceImpl.ModifiedRollResult> computeModifiedRoll(
            @RequestParam(name = "open") Integer openTotal,
            @RequestParam(name = "attackerTb", required = false) Integer attackerTb,
            @RequestParam(name = "attackerTbForDefense", required = false) Integer attackerTbForDefense,
            @RequestParam(name = "attackerPenalty", required = false) Integer attackerPenalty,
            @RequestParam(name = "defenderVb", required = false) Integer defenderVb,
            @RequestParam(name = "defenderTbForDefense", required = false) Integer defenderTbForDefense,
            @RequestParam(name = "defenderShield", required = false) Integer defenderShield,
            @RequestParam(name = "defenderPenalty", required = false) Integer defenderPenalty,
            @RequestParam(name = "modifiers", required = false) Integer modifiers,
            @RequestParam(name = "total", required = false) Integer totalOverride
    ) {
        if (openTotal == null) {
            return ResponseEntity.badRequest().build();
        }

        // If FE provided a full override breakdown, echo that back for parity
        boolean haveOverrides = attackerTb != null && attackerTbForDefense != null && attackerPenalty != null
                && defenderVb != null && defenderTbForDefense != null && defenderShield != null
                && defenderPenalty != null && modifiers != null && totalOverride != null;
        if (haveOverrides) {
            FightServiceImpl.ModifiedRollResult res = new FightServiceImpl.ModifiedRollResult();
            res.open = openTotal;
            res.attackerTb = attackerTb;
            res.attackerTbForDefense = attackerTbForDefense;
            res.attackerPenalty = attackerPenalty;
            res.defenderVb = defenderVb;
            res.defenderTbForDefense = defenderTbForDefense;
            res.defenderShield = defenderShield;
            res.defenderPenalty = defenderPenalty;
            res.modifiers = modifiers;
            res.total = totalOverride;
            return ResponseEntity.ok(res);
        }

        FightServiceImpl.ModifiedRollResult res = fightServiceImpl.computeModifiedRoll(openTotal);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/fight/resolve-attack")
    public ResponseEntity<AttackResultResponse> resolveAttack(@RequestParam(name = "total") Integer total,
                                                              @RequestParam(name = "attackType", required = false) com.sol.merp.attributes.AttackType attackTypeOverride,
                                                              @RequestParam(name = "defenderArmor", required = false) com.sol.merp.attributes.ArmorType defenderArmorOverride) {
        if (total == null) {
            return ResponseEntity.badRequest().build();
        }

        Player attacker;
        Player defender;
        List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair != null && pair.size() >= 2) {
            attacker = pair.get(0);
            defender = pair.get(1);
        } else if (attackTypeOverride != null && defenderArmorOverride != null) {
            // Fallback: construct minimal players from overrides
            attacker = new Player();
            attacker.setAttackType(attackTypeOverride);
            defender = new Player();
            defender.setArmorType(defenderArmorOverride);
        } else {
            // No active pair and no overrides
            AttackResultResponse resp = new AttackResultResponse();
            resp.setResult("Fail");
            resp.setRow(java.util.Arrays.asList("Fail", "Fail", "Fail", "Fail", "Fail"));
            resp.setTotal(total);
            return ResponseEntity.ok(resp);
        }

        log.info("RESOLVE: attacker.id={} attacker.attackType={} defender.id={} defender.armorType={} inputTotal={}",
                attacker != null ? attacker.getId() : null,
                attacker != null ? attacker.getAttackType() : null,
                defender != null ? defender.getId() : null,
                defender != null ? defender.getArmorType() : null,
                total);

        List<String> row;
        try {
            row = fightServiceImpl.getAttackResultRowByAttackType(attacker, total);
        } catch (Exception ex) {
            log.warn("RESOLVE: exception while getting GS row for attackType={} total={} -> {}",
                    attacker != null ? attacker.getAttackType() : null, total, ex.toString());
            AttackResultResponse resp = new AttackResultResponse();
            resp.setResult("Fail");
            resp.setRow(java.util.Arrays.asList("Fail", "Fail", "Fail", "Fail", "Fail"));
            resp.setTotal(total);
            return ResponseEntity.ok(resp);
        }
        if (row == null || row.size() < 5) {
            log.warn("RESOLVE: invalid GS row for attackType={} total={} (row is null or size<5)",
                    attacker != null ? attacker.getAttackType() : null, total);
            AttackResultResponse resp = new AttackResultResponse();
            resp.setResult("Fail");
            resp.setRow(java.util.Arrays.asList("Fail", "Fail", "Fail", "Fail", "Fail"));
            resp.setTotal(total);
            return ResponseEntity.ok(resp);
        }

        String result = fightServiceImpl.getAttackResultFromRowByDefenderArmor(row, defender);
        log.info("RESOLVE: result={} row[0..4]={}", result, row.subList(0, 5));

        AttackResultResponse resp = new AttackResultResponse();
        resp.setResult(result);
        resp.setRow(row);
        resp.setTotal(total);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/fight/apply-attack")
    public ResponseEntity<com.sol.merp.dto.AttackResultsDTO> applyAttack(@RequestParam(name = "result") String result) {
        if (result == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.size() < 2) {
            return ResponseEntity.badRequest().build();
        }
        Player attacker = pair.get(0);
        Player defender = pair.get(1);

        com.sol.merp.dto.AttackResultsDTO dto = fightServiceImpl.applyResolvedAttack(attacker, defender, result);
        return ResponseEntity.ok(dto);
    }

    // Apply fail effects directly to a specific attacker by ID, independent from the global pair
    @PostMapping("/fight/apply-fail-to-attacker")
    public ResponseEntity<com.sol.merp.dto.AttackResultsDTO> applyFailToAttacker(
            @RequestParam(name = "attackerId") Long attackerId,
            @RequestParam(name = "failRoll") Integer failRoll) {
        if (attackerId == null || failRoll == null) {
            return ResponseEntity.badRequest().build();
        }
        Optional<Player> attackerOpt = playerRepository.findById(attackerId);
        if (attackerOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Player attacker = attackerOpt.get();
        com.sol.merp.dto.AttackResultsDTO dto = fightServiceImpl.applyFailToAttackerByProvidedRoll(attacker, failRoll);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/fight/apply-attack-with-crit")
    public ResponseEntity<com.sol.merp.dto.AttackResultsDTO> applyAttackWithCrit(@RequestParam(name = "result") String result,
                                                                                  @RequestParam(name = "critRoll") Integer critRoll) {
        if (result == null || critRoll == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.size() < 2) {
            return ResponseEntity.badRequest().build();
        }
        Player attacker = pair.get(0);
        Player defender = pair.get(1);

        com.sol.merp.dto.AttackResultsDTO dto = fightServiceImpl.applyResolvedAttackWithCritRoll(attacker, defender, result, critRoll);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/fight/apply-crit-to-target")
    public ResponseEntity<com.sol.merp.dto.AttackResultsDTO> applyCritToTarget(@RequestParam(name = "defenderId") Long defenderId,
                                                                               @RequestParam(name = "result") String result,
                                                                               @RequestParam(name = "critResult") Integer critResult,
                                                                               @RequestParam(name = "critType") CritType critType) {
        if (defenderId == null || result == null || critResult == null || critType == null) {
            return ResponseEntity.badRequest().build();
        }
        Optional<Player> defenderOpt = playerRepository.findById(defenderId);
        if (defenderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Player defender = defenderOpt.get();

        Player attacker = null;
        try {
            java.util.List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
            if (pair != null && pair.size() >= 1) attacker = pair.get(0);
        } catch (Exception ignore) {}
        if (attacker == null) {
            attacker = new Player();
            attacker.setAttackType(AttackType.none);
        }
        attacker.setCritType(critType);

        String letter = fightServiceImpl.getCritFromAttackResult(result);
        int delta = 0;
        if ("T".equals(letter)) delta = -50;
        else if ("A".equals(letter)) delta = -20;
        else if ("B".equals(letter)) delta = -10;
        else if ("C".equals(letter)) delta = 0;
        else if ("D".equals(letter)) delta = 10;
        else if ("E".equals(letter)) delta = 20;
        int rawRoll = critResult - delta;

        try { playerService.adventurersOrderedList(); } catch (Exception ignore) {}
        com.sol.merp.dto.AttackResultsDTO dto = fightServiceImpl.applyResolvedAttackWithCritRoll(attacker, defender, result, rawRoll);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/fight/apply-attack-with-fail")
    public ResponseEntity<com.sol.merp.dto.AttackResultsDTO> applyAttackWithFail(@RequestParam(name = "failRoll") Integer failRoll) {
        if (failRoll == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.size() < 2) {
            return ResponseEntity.badRequest().build();
        }
        Player attacker = pair.get(0);
        Player defender = pair.get(1);

        com.sol.merp.dto.AttackResultsDTO dto = fightServiceImpl.applyResolvedAttackWithFailRoll(attacker, defender, failRoll);
        return ResponseEntity.ok(dto);
    }

    // Compute crit effects for a given crit letter and a provided roll (client-side dice)
    @GetMapping("/fight/crit-roll-with")
    public ResponseEntity<AttackResultsDTO> critRollWith(@RequestParam(name = "crit") String crit,
                                                         @RequestParam(name = "roll") Integer roll) {
        if (crit == null || crit.isEmpty() || roll == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.size() < 2) {
            return ResponseEntity.badRequest().build();
        }
        Player attacker = pair.get(0);

        int modified = fightServiceImpl.getModifiedCritRoll(roll, crit);
        java.util.List<String> row = fightServiceImpl.getCritResultRow(attacker, modified);
        if (row == null || row.size() < 6) {
            return ResponseEntity.badRequest().build();
        }

        AttackResultsDTO dto = new AttackResultsDTO();
        dto.setCrit(crit);
        dto.setCritResultText(row.get(0));
        dto.setCritResultAdditionalDamage(Integer.parseInt(row.get(1)));
        dto.setCritResultHPLossPerRound(Integer.parseInt(row.get(2)));
        dto.setCritResultStunnedForRounds(Integer.parseInt(row.get(3)));
        dto.setCritResultPenaltyOfActions(Integer.parseInt(row.get(4)));
        dto.setCritResultsInstantDeath("1".equals(row.get(5)));
        return ResponseEntity.ok(dto);
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

    @GetMapping("/meta/genders")
    public List<Gender> genders() {
        return Arrays.asList(Gender.values());
    }

    @GetMapping("/meta/races")
    public List<RaceOption> races() {
        List<RaceOption> result = new ArrayList<>();
        for (Race race : Race.values()) {
            result.add(new RaceOption(race.name(), race.getDisplayName()));
        }
        return result;
    }

    @GetMapping("/meta/player-classes")
    public List<PlayerClass> playerClasses() {
        return Arrays.asList(PlayerClass.values());
    }

    @GetMapping("/meta/armor-types")
    public List<ArmorType> armorTypes() {
        return Arrays.asList(ArmorType.values());
    }

    @GetMapping("/meta/weapon-types")
    public List<WeaponType> weaponTypes() {
        return Arrays.asList(WeaponType.values());
    }

    @GetMapping("/meta/weapon-spec-types")
    public List<WeaponSpecType> weaponSpecTypes() {
        return Arrays.asList(WeaponSpecType.values());
    }

    @GetMapping("/meta/player-targets")
    public List<PlayerTarget> playerTargets() {
        return Arrays.asList(PlayerTarget.values());
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

            // Resolve equipped weapon (optional) so we can include its bonuses in TB computation
            Weapon equippedWeapon = null;
            Long equippedWeaponId = incoming.getEquippedWeaponId();
            if (equippedWeaponId != null) {
                Optional<Weapon> weaponOpt = weaponRepository.findById(equippedWeaponId);
                if (weaponOpt.isPresent()) {
                    equippedWeapon = weaponOpt.get();
                } else {
                    log.warn("Equipped weapon id={} not found for player id={}; clearing reference", equippedWeaponId, incoming.getId());
                    incoming.setEquippedWeaponId(null);
                }
            }

            // Compute and set main/off-hand TB columns based on current attack type, detailed TB fields, and weapon bonuses
            Integer computedTb = computeTb(incoming, equippedWeapon);
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
                incoming.setTbOffHand(0);
            }

            // 3) Non-negative counters (penaltyOfActions is derived server-side; do not override it here)
            if (incoming.getStunnedForRounds() == null || incoming.getStunnedForRounds() < 0)
                incoming.setStunnedForRounds(0);
            if (incoming.getHpLossPerRound() == null || incoming.getHpLossPerRound() < 0)
                incoming.setHpLossPerRound(0);

            // 3/b) Clamp detailed TBs to non-negative (schema may enforce >= 0)
            if (incoming.getTb1HSlashing() == null || incoming.getTb1HSlashing() < 0) incoming.setTb1HSlashing(0);
            if (incoming.getTb1HBlunt() == null || incoming.getTb1HBlunt() < 0) incoming.setTb1HBlunt(0);
            if (incoming.getTbTwoHanded() == null || incoming.getTbTwoHanded() < 0) incoming.setTbTwoHanded(0);
            if (incoming.getTbRanged() == null || incoming.getTbRanged() < 0) incoming.setTbRanged(0);
            if (incoming.getTbBaseMagic() == null || incoming.getTbBaseMagic() < 0) incoming.setTbBaseMagic(0);
            if (incoming.getTbTargetMagic() == null || incoming.getTbTargetMagic() < 0) incoming.setTbTargetMagic(0);
            if (incoming.getDualWield() == null || incoming.getDualWield() < 0) incoming.setDualWield(0);

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
                    incoming.setTbOffHand(0);
                } else {
                    incoming.setIsActive(true);
                }
            }
            // If attack type is none, enforce neutral combat state
            if (incoming.getAttackType() == AttackType.none) {
                incoming.setTarget(PlayerTarget.none);
                incoming.setTb(0);
                incoming.setTbUsedForDefense(0);
                incoming.setTbOffHand(0);
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
                existing.setTbOffHand(incoming.getTbOffHand());
                existing.setEquippedWeaponId(incoming.getEquippedWeaponId());
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
        // Start of a new combat session: clear per-round penalty effects
        try {
            java.util.List<Player> all = playerRepository.findAll();
            for (Player p : all) {
                if (p.getActivePenaltyEffects() != null) {
                    p.getActivePenaltyEffects().clear();
                } else {
                    p.setActivePenaltyEffects(new java.util.ArrayList<>());
                }
                p.setHpLossPerRound(0);
                // derive displayed penalty from active effects (now none)
                p.setPenaltyOfActions(0);
                playerRepository.save(p);
            }
        } catch (Exception ignore) {}
        return ResponseEntity.ok(round.getRoundCount());
    }

    @PostMapping("/fight/start-round")
    public ResponseEntity<NextTwoPlayersToFigthObject> startRound() throws Exception {
        playerService.resetActivePlayersBuffer();
        // Ensure backend state reflects latest statuses before selecting next players
        playerService.playerActivitySwitch();
        playerService.doNothingWhenStunned();
        // If this is the first round of a new session, ensure penalties/effects are clean
        if (round.getRoundCount() == 0) {
            try {
                java.util.List<Player> all = playerRepository.findAll();
                for (Player p : all) {
                    if (p.getActivePenaltyEffects() != null) p.getActivePenaltyEffects().clear();
                    else p.setActivePenaltyEffects(new java.util.ArrayList<>());
                    p.setHpLossPerRound(0);
                    p.setPenaltyOfActions(0);
                    playerRepository.save(p);
                }
            } catch (Exception ignore) {}
        }
        // Start-of-round ticking: penalties and HP loss per round
        fightServiceImpl.tickStartOfRoundEffects();
        playerService.adventurersOrderedList();
        // increment round counter on new round start
        round.setRoundCount(round.getRoundCount() + 1);
        NextTwoPlayersToFigthObject result = playerService.nextPlayersToFight();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/fight/next-round")
    public ResponseEntity<NextTwoPlayersToFigthObject> startNextRound() throws Exception {
        NextTwoPlayersToFigthObject result = playerService.nextPlayersToFight();
        // If no more attackers this round -> end-of-round hook (stun tick)
        if (result == null || result.getNextTwoPlayersToFight() == null || result.getNextTwoPlayersToFight().size() < 2) {
            fightServiceImpl.decreaseStunnedAtEndOfRound();
            playerService.adventurersOrderedList();
        }
        return ResponseEntity.ok(result);
    }

    private Integer computeTb(Player p, Weapon weapon) {
        if (p == null) {
            return null;
        }
        AttackType attackType = p.getAttackType();
        if (attackType == null) {
            int bonusMainOnly = weapon != null && weapon.getExtraTBMH() != null ? weapon.getExtraTBMH() : 0;
            int bonusOffOnly = weapon != null && weapon.getExtraTBOH() != null ? weapon.getExtraTBOH() : 0;
            int base = p.getTb() != null ? p.getTb() : 0;
            int result = base + bonusMainOnly;
            p.setTbOffHand(bonusOffOnly);
            return result;
        }

        int main = 0;
        int off = 0;
        switch (attackType) {
            case slashing:
            case blunt:
            case clawsAndFangs:
            case grabOrBalance:
                main = p.getTb1HSlashing() != null ? p.getTb1HSlashing() : 0;
                break;
            case dualWield:
                main = DualWieldCalculator.computeMainHandTb(p.getTb1HSlashing(), p.getDualWield());
                off = DualWieldCalculator.computeOffHandTb(p.getTb1HSlashing(), p.getDualWield());
                break;
            case twoHanded:
                main = p.getTbTwoHanded() != null ? p.getTbTwoHanded() : 0;
                break;
            case ranged:
                main = p.getTbRanged() != null ? p.getTbRanged() : 0;
                break;
            case baseMagic:
            case magicBall:
                main = p.getTbBaseMagic() != null ? p.getTbBaseMagic() : 0;
                break;
            case magicProjectile:
                main = p.getTbTargetMagic() != null ? p.getTbTargetMagic() : 0;
                break;
            default:
                main = p.getTb() != null ? p.getTb() : 0;
                break;
        }

        int bonusMain = weapon != null && weapon.getExtraTBMH() != null ? weapon.getExtraTBMH() : 0;
        int bonusOff = weapon != null && weapon.getExtraTBOH() != null ? weapon.getExtraTBOH() : 0;
        int finalMain = main + bonusMain;
        int finalOff = off + bonusOff;
        p.setTbOffHand(finalOff);
        return finalMain;
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
