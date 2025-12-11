package com.sol.merp.backup;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerAttributeTotal;
import com.sol.merp.characters.PlayerAttributeTotalRepository;
import com.sol.merp.characters.PlayerBonusAdjustment;
import com.sol.merp.characters.PlayerBonusAdjustmentRepository;
import com.sol.merp.characters.PlayerLanguage;
import com.sol.merp.characters.PlayerLanguageRepository;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerSpellList;
import com.sol.merp.characters.PlayerSpellListRepository;
import com.sol.merp.inventory.PlayerInventoryItem;
import com.sol.merp.inventory.PlayerInventoryItemRepository;
import com.sol.merp.modifiers.AttackModifier;
import com.sol.merp.modifiers.AttackModifierRepository;
import com.sol.merp.modifiers.RangedMagicModifier;
import com.sol.merp.modifiers.RangedMagicModifierRepository;
import com.sol.merp.skills.PlayerSkill;
import com.sol.merp.skills.PlayerSkillRepository;
import com.sol.merp.weapons.Weapon;
import com.sol.merp.weapons.WeaponRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class FileSystemBackupService implements BackupService {

    private static final Logger log = LoggerFactory.getLogger(FileSystemBackupService.class);

    private final PlayerRepository playerRepository;
    private final PlayerInventoryItemRepository playerInventoryItemRepository;
    private final PlayerSkillRepository playerSkillRepository;
    private final PlayerLanguageRepository playerLanguageRepository;
    private final PlayerSpellListRepository playerSpellListRepository;
    private final PlayerAttributeTotalRepository playerAttributeTotalRepository;
    private final PlayerBonusAdjustmentRepository playerBonusAdjustmentRepository;
    private final AttackModifierRepository attackModifierRepository;
    private final RangedMagicModifierRepository rangedMagicModifierRepository;
    private final WeaponRepository weaponRepository;
    private final ObjectMapper objectMapper;
    private final Path baseDir;
    private final String schemaVersion;

    public FileSystemBackupService(PlayerRepository playerRepository,
                                   PlayerInventoryItemRepository playerInventoryItemRepository,
                                   PlayerSkillRepository playerSkillRepository,
                                   PlayerLanguageRepository playerLanguageRepository,
                                   PlayerSpellListRepository playerSpellListRepository,
                                   PlayerAttributeTotalRepository playerAttributeTotalRepository,
                                   PlayerBonusAdjustmentRepository playerBonusAdjustmentRepository,
                                   AttackModifierRepository attackModifierRepository,
                                   RangedMagicModifierRepository rangedMagicModifierRepository,
                                   WeaponRepository weaponRepository,
                                   ObjectMapper objectMapper,
                                   @Value("${merp.backup.base-dir:backups}") String baseDir) {
        this.playerRepository = playerRepository;
        this.playerInventoryItemRepository = playerInventoryItemRepository;
        this.playerSkillRepository = playerSkillRepository;
        this.playerLanguageRepository = playerLanguageRepository;
        this.playerSpellListRepository = playerSpellListRepository;
        this.playerAttributeTotalRepository = playerAttributeTotalRepository;
        this.playerBonusAdjustmentRepository = playerBonusAdjustmentRepository;
        this.attackModifierRepository = attackModifierRepository;
        this.rangedMagicModifierRepository = rangedMagicModifierRepository;
        this.weaponRepository = weaponRepository;
        this.objectMapper = objectMapper;
        this.baseDir = Paths.get(baseDir);
        this.schemaVersion = "v1";
    }

    @Override
    public List<BackupDomain.BackupMetadata> listBackups(BackupDomain.BackupType type) {
        Path dir = resolveDir(type);
        if (!Files.exists(dir)) {
            return new ArrayList<>();
        }
        try (Stream<Path> stream = Files.list(dir)) {
            return stream
                    .filter(p -> p.getFileName().toString().endsWith(".json"))
                    .sorted(Comparator.reverseOrder())
                    .map(p -> readMetadata(type, p))
                    .filter(m -> m != null)
                    .collect(Collectors.toList());
        } catch (IOException e) {
            log.warn("Failed to list backups for type {} -> {}", type, e.toString());
            return new ArrayList<>();
        }
    }

    @Override
    public BackupDomain.BackupMetadata createWeaponBackup(String label) {
        List<Weapon> weapons = weaponRepository.findAll();

        BackupDomain.BackupMetadata meta = new BackupDomain.BackupMetadata();
        String id = UUID.randomUUID().toString();
        meta.setId(id);
        meta.setType(BackupDomain.BackupType.WEAPON);
        meta.setLabel(label);
        meta.setCreatedAt(Instant.now());
        meta.setSchemaVersion(schemaVersion);
        meta.setWeaponCount((long) weapons.size());
        meta.setPlayerCount(null);
        meta.setWeaponBackupId(null);

        String timestamp = DateTimeFormatter.ISO_INSTANT.format(meta.getCreatedAt()).replace(":", "-");
        String fileName = "weapon-backup-" + timestamp + "-" + id + ".json";
        meta.setFileName(fileName);

        WeaponBackupPayload payload = new WeaponBackupPayload();
        payload.setMetadata(meta);
        payload.setWeapons(weapons);

        Path dir = resolveDir(BackupDomain.BackupType.WEAPON);
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(fileName);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(target.toFile(), payload);
            return meta;
        } catch (IOException e) {
            log.warn("Failed to create weapon backup -> {}", e.toString());
            throw new IllegalStateException("Failed to create weapon backup", e);
        }
    }

    @Override
    public BackupDomain.BackupMetadata createPlayerBackup(String label, String weaponBackupId) {
        List<Player> players = playerRepository.findAll();
        List<PlayerInventoryItem> inventoryItems = playerInventoryItemRepository.findAll();
        List<PlayerSkill> playerSkills = playerSkillRepository.findAll();
        List<PlayerLanguage> languages = playerLanguageRepository.findAll();
        List<PlayerSpellList> spellLists = playerSpellListRepository.findAll();
        List<PlayerAttributeTotal> attributeTotals = playerAttributeTotalRepository.findAll();
        List<PlayerBonusAdjustment> bonusAdjustments = playerBonusAdjustmentRepository.findAll();
        List<AttackModifier> attackModifiers = attackModifierRepository.findAll();
        List<RangedMagicModifier> rangedMagicModifiers = rangedMagicModifierRepository.findAll();

        BackupDomain.BackupMetadata meta = new BackupDomain.BackupMetadata();
        String id = UUID.randomUUID().toString();
        meta.setId(id);
        meta.setType(BackupDomain.BackupType.PLAYER);
        meta.setLabel(label);
        meta.setCreatedAt(Instant.now());
        meta.setSchemaVersion(schemaVersion);
        meta.setPlayerCount((long) players.size());
        meta.setWeaponCount(null);
        meta.setWeaponBackupId(weaponBackupId);

        String timestamp = DateTimeFormatter.ISO_INSTANT.format(meta.getCreatedAt()).replace(":", "-");
        String fileName = "player-backup-" + timestamp + "-" + id + ".json";
        meta.setFileName(fileName);

        PlayerBackupPayload payload = new PlayerBackupPayload();
        payload.setMetadata(meta);
        payload.setPlayers(players);
        payload.setInventoryItems(inventoryItems);
        payload.setPlayerSkills(playerSkills);
        payload.setLanguages(languages);
        payload.setSpellLists(spellLists);
        payload.setAttributeTotals(attributeTotals);
        payload.setBonusAdjustments(bonusAdjustments);
        payload.setAttackModifiers(attackModifiers);
        payload.setRangedMagicModifiers(rangedMagicModifiers);

        Path dir = resolveDir(BackupDomain.BackupType.PLAYER);
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(fileName);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(target.toFile(), payload);
            return meta;
        } catch (IOException e) {
            log.warn("Failed to create player backup -> {}", e.toString());
            throw new IllegalStateException("Failed to create player backup", e);
        }
    }

    @Override
    @Transactional
    public void deleteAllPlayerData() {
        attackModifierRepository.deleteAll();
        rangedMagicModifierRepository.deleteAll();
        playerInventoryItemRepository.deleteAll();
        playerSkillRepository.deleteAll();
        playerLanguageRepository.deleteAll();
        playerSpellListRepository.deleteAll();
        playerAttributeTotalRepository.deleteAll();
        playerBonusAdjustmentRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Override
    @Transactional
    public void deleteAllWeaponData() {
        List<Player> players = playerRepository.findAll();
        for (Player p : players) {
            p.setEquippedWeaponId(null);
        }
        playerRepository.saveAll(players);

        playerInventoryItemRepository.deleteAll();
        weaponRepository.deleteAll();
    }

    @Override
    @Transactional
    public void restoreWeaponBackup(String backupId, BackupDomain.RestoreMode mode) {
        if (backupId == null || backupId.trim().isEmpty()) {
            throw new IllegalArgumentException("backupId must not be null or empty");
        }
        BackupDomain.RestoreMode effectiveMode = (mode != null) ? mode : BackupDomain.RestoreMode.OVERWRITE;

        List<BackupDomain.BackupMetadata> all = listBackups(BackupDomain.BackupType.WEAPON);
        BackupDomain.BackupMetadata meta = all.stream()
                .filter(m -> backupId.equals(m.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Weapon backup not found: " + backupId));

        Path dir = resolveDir(BackupDomain.BackupType.WEAPON);
        String fileName = meta.getFileName();
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new IllegalStateException("Backup metadata missing fileName for id=" + backupId);
        }
        Path file = dir.resolve(fileName);
        if (!Files.exists(file)) {
            throw new IllegalStateException("Backup file not found for id=" + backupId + ": " + file);
        }

        WeaponBackupPayload payload;
        try {
            payload = objectMapper.readValue(file.toFile(), WeaponBackupPayload.class);
        } catch (IOException e) {
            log.warn("Failed to read weapon backup payload from file {} -> {}", file, e.toString());
            throw new IllegalStateException("Failed to read weapon backup payload", e);
        }

        List<Weapon> weapons = payload.getWeapons() != null ? payload.getWeapons() : new ArrayList<>();

        if (effectiveMode == BackupDomain.RestoreMode.FILL_EMPTY_OR_CREATE) {
            long weaponCount = weaponRepository.count();
            long inventoryCount = playerInventoryItemRepository.count();
            if (weaponCount > 0 || inventoryCount > 0) {
                throw new IllegalStateException("Cannot restore weapon backup in FILL_EMPTY_OR_CREATE mode: existing weapon or inventory data present");
            }
            for (Weapon w : weapons) {
                if (w != null) {
                    w.setId(null);
                }
            }
            weaponRepository.saveAll(weapons);
            return;
        }

        List<Player> players = playerRepository.findAll();
        for (Player p : players) {
            p.setEquippedWeaponId(null);
        }
        playerRepository.saveAll(players);

        playerInventoryItemRepository.deleteAll();
        weaponRepository.deleteAll();

        for (Weapon w : weapons) {
            if (w != null) {
                w.setId(null);
            }
        }
        weaponRepository.saveAll(weapons);
    }

    @Override
    public WeaponBackupPayload loadWeaponBackupPayload(String backupId) {
        if (backupId == null || backupId.trim().isEmpty()) {
            throw new IllegalArgumentException("backupId must not be null or empty");
        }
        List<BackupDomain.BackupMetadata> all = listBackups(BackupDomain.BackupType.WEAPON);
        BackupDomain.BackupMetadata meta = all.stream()
                .filter(m -> backupId.equals(m.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Weapon backup not found: " + backupId));

        Path dir = resolveDir(BackupDomain.BackupType.WEAPON);
        String fileName = meta.getFileName();
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new IllegalStateException("Backup metadata missing fileName for id=" + backupId);
        }
        Path file = dir.resolve(fileName);
        if (!Files.exists(file)) {
            throw new IllegalStateException("Backup file not found for id=" + backupId + ": " + file);
        }

        try {
            return objectMapper.readValue(file.toFile(), WeaponBackupPayload.class);
        } catch (IOException e) {
            log.warn("Failed to read weapon backup payload from file {} -> {}", file, e.toString());
            throw new IllegalStateException("Failed to read weapon backup payload", e);
        }
    }

    @Override
    @Transactional
    public void restorePlayerBackup(String backupId, BackupDomain.RestoreMode mode, boolean restorePairedWeapon) {
        if (backupId == null || backupId.trim().isEmpty()) {
            throw new IllegalArgumentException("backupId must not be null or empty");
        }
        BackupDomain.RestoreMode effectiveMode = (mode != null) ? mode : BackupDomain.RestoreMode.OVERWRITE;

        List<BackupDomain.BackupMetadata> all = listBackups(BackupDomain.BackupType.PLAYER);
        BackupDomain.BackupMetadata meta = all.stream()
                .filter(m -> backupId.equals(m.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Player backup not found: " + backupId));

        // Optionally restore paired weapon snapshot first
        if (restorePairedWeapon) {
            String weaponBackupId = meta.getWeaponBackupId();
            if (weaponBackupId != null && !weaponBackupId.trim().isEmpty()) {
                restoreWeaponBackup(weaponBackupId, effectiveMode);
            }
        }

        Path dir = resolveDir(BackupDomain.BackupType.PLAYER);
        String fileName = meta.getFileName();
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new IllegalStateException("Backup metadata missing fileName for id=" + backupId);
        }
        Path file = dir.resolve(fileName);
        if (!Files.exists(file)) {
            throw new IllegalStateException("Backup file not found for id=" + backupId + ": " + file);
        }

        PlayerBackupPayload payload;
        try {
            payload = objectMapper.readValue(file.toFile(), PlayerBackupPayload.class);
        } catch (IOException e) {
            log.warn("Failed to read player backup payload from file {} -> {}", file, e.toString());
            throw new IllegalStateException("Failed to read player backup payload", e);
        }

        List<Player> players = payload.getPlayers() != null ? payload.getPlayers() : new ArrayList<>();
        List<PlayerInventoryItem> inventoryItems = payload.getInventoryItems() != null ? payload.getInventoryItems() : new ArrayList<>();
        List<PlayerSkill> playerSkills = payload.getPlayerSkills() != null ? payload.getPlayerSkills() : new ArrayList<>();
        List<PlayerLanguage> languages = payload.getLanguages() != null ? payload.getLanguages() : new ArrayList<>();
        List<PlayerSpellList> spellLists = payload.getSpellLists() != null ? payload.getSpellLists() : new ArrayList<>();
        List<PlayerAttributeTotal> attributeTotals = payload.getAttributeTotals() != null ? payload.getAttributeTotals() : new ArrayList<>();
        List<PlayerBonusAdjustment> bonusAdjustments = payload.getBonusAdjustments() != null ? payload.getBonusAdjustments() : new ArrayList<>();
        List<AttackModifier> attackModifiers = payload.getAttackModifiers() != null ? payload.getAttackModifiers() : new ArrayList<>();
        List<RangedMagicModifier> rangedMagicModifiers = payload.getRangedMagicModifiers() != null ? payload.getRangedMagicModifiers() : new ArrayList<>();

        if (effectiveMode == BackupDomain.RestoreMode.FILL_EMPTY_OR_CREATE) {
            long playerCount = playerRepository.count();
            long invCount = playerInventoryItemRepository.count();
            long skillCount = playerSkillRepository.count();
            long langCount = playerLanguageRepository.count();
            long spellCount = playerSpellListRepository.count();
            long attrCount = playerAttributeTotalRepository.count();
            long bonusCount = playerBonusAdjustmentRepository.count();
            long modCount = attackModifierRepository.count();
            long rangedCount = rangedMagicModifierRepository.count();
            if (playerCount > 0 || invCount > 0 || skillCount > 0 || langCount > 0
                    || spellCount > 0 || attrCount > 0 || bonusCount > 0 || modCount > 0 || rangedCount > 0) {
                throw new IllegalStateException("Cannot restore player backup in FILL_EMPTY_OR_CREATE mode: existing player-related data present");
            }
        } else {
            // OVERWRITE: clear existing data first
            deleteAllPlayerData();
        }

        // Insert players first and build mapping from oldId -> new Player
        java.util.Map<Long, Player> idMap = new java.util.HashMap<>();
        for (Player p : players) {
            if (p == null) continue;
            Long oldId = p.getId();
            p.setId(null);
            Player saved = playerRepository.save(p);
            if (oldId != null) {
                idMap.put(oldId, saved);
            }
        }

        // Helper to resolve new player by old id from an attached object
        java.util.function.Function<Player, Player> remapPlayer = (oldPlayer) -> {
            if (oldPlayer == null) return null;
            Long oldId = oldPlayer.getId();
            if (oldId == null) return null;
            return idMap.get(oldId);
        };

        // Restore inventory items
        List<PlayerInventoryItem> invToSave = new ArrayList<>();
        for (PlayerInventoryItem item : inventoryItems) {
            if (item == null) continue;
            Player newPlayer = remapPlayer.apply(item.getPlayer());
            if (newPlayer == null) continue;
            Weapon weapon = null;
            if (item.getWeapon() != null && item.getWeapon().getId() != null) {
                weapon = weaponRepository.findById(item.getWeapon().getId()).orElse(null);
            }
            if (weapon == null) {
                // Skip inventory entries that refer to missing weapons
                continue;
            }
            item.setId(null);
            item.setPlayer(newPlayer);
            item.setWeapon(weapon);
            invToSave.add(item);
        }
        if (!invToSave.isEmpty()) {
            playerInventoryItemRepository.saveAll(invToSave);
        }

        // Restore skills
        List<PlayerSkill> skillsToSave = new ArrayList<>();
        for (PlayerSkill s : playerSkills) {
            if (s == null) continue;
            Player newPlayer = remapPlayer.apply(s.getPlayer());
            if (newPlayer == null) continue;
            s.setId(null);
            s.setPlayer(newPlayer);
            skillsToSave.add(s);
        }
        if (!skillsToSave.isEmpty()) {
            playerSkillRepository.saveAll(skillsToSave);
        }

        // Restore languages
        List<PlayerLanguage> langsToSave = new ArrayList<>();
        for (PlayerLanguage l : languages) {
            if (l == null) continue;
            Player newPlayer = remapPlayer.apply(l.getPlayer());
            if (newPlayer == null) continue;
            l.setId(null);
            l.setPlayer(newPlayer);
            langsToSave.add(l);
        }
        if (!langsToSave.isEmpty()) {
            playerLanguageRepository.saveAll(langsToSave);
        }

        // Restore spell lists
        List<PlayerSpellList> spellsToSave = new ArrayList<>();
        for (PlayerSpellList sl : spellLists) {
            if (sl == null) continue;
            Player newPlayer = remapPlayer.apply(sl.getPlayer());
            if (newPlayer == null) continue;
            sl.setId(null);
            sl.setPlayer(newPlayer);
            spellsToSave.add(sl);
        }
        if (!spellsToSave.isEmpty()) {
            playerSpellListRepository.saveAll(spellsToSave);
        }

        // Restore attribute totals
        List<PlayerAttributeTotal> attrsToSave = new ArrayList<>();
        for (PlayerAttributeTotal at : attributeTotals) {
            if (at == null) continue;
            Player newPlayer = remapPlayer.apply(at.getPlayer());
            if (newPlayer == null) continue;
            at.setId(null);
            at.setPlayer(newPlayer);
            attrsToSave.add(at);
        }
        if (!attrsToSave.isEmpty()) {
            playerAttributeTotalRepository.saveAll(attrsToSave);
        }

        // Restore bonus adjustments
        List<PlayerBonusAdjustment> bonusesToSave = new ArrayList<>();
        for (PlayerBonusAdjustment ba : bonusAdjustments) {
            if (ba == null) continue;
            Player newPlayer = remapPlayer.apply(ba.getPlayer());
            if (newPlayer == null) continue;
            ba.setId(null);
            ba.setPlayer(newPlayer);
            bonusesToSave.add(ba);
        }
        if (!bonusesToSave.isEmpty()) {
            playerBonusAdjustmentRepository.saveAll(bonusesToSave);
        }

        // Restore attack modifiers
        List<AttackModifier> modsToSave = new ArrayList<>();
        for (AttackModifier am : attackModifiers) {
            if (am == null) continue;
            Player newPlayer = remapPlayer.apply(am.getPlayer());
            if (newPlayer == null) continue;
            am.setId(null);
            am.setPlayer(newPlayer);
            modsToSave.add(am);
        }
        if (!modsToSave.isEmpty()) {
            attackModifierRepository.saveAll(modsToSave);
        }

        // Restore ranged magic modifiers
        List<RangedMagicModifier> rmsToSave = new ArrayList<>();
        for (RangedMagicModifier rm : rangedMagicModifiers) {
            if (rm == null) continue;
            Player newPlayer = remapPlayer.apply(rm.getPlayer());
            if (newPlayer == null) continue;
            rm.setId(null);
            rm.setPlayer(newPlayer);
            rmsToSave.add(rm);
        }
        if (!rmsToSave.isEmpty()) {
            rangedMagicModifierRepository.saveAll(rmsToSave);
        }
    }

    @Override
    public PlayerBackupPayload loadPlayerBackupPayload(String backupId) {
        if (backupId == null || backupId.trim().isEmpty()) {
            throw new IllegalArgumentException("backupId must not be null or empty");
        }
        List<BackupDomain.BackupMetadata> all = listBackups(BackupDomain.BackupType.PLAYER);
        BackupDomain.BackupMetadata meta = all.stream()
                .filter(m -> backupId.equals(m.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Player backup not found: " + backupId));

        Path dir = resolveDir(BackupDomain.BackupType.PLAYER);
        String fileName = meta.getFileName();
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new IllegalStateException("Backup metadata missing fileName for id=" + backupId);
        }
        Path file = dir.resolve(fileName);
        if (!Files.exists(file)) {
            throw new IllegalStateException("Backup file not found for id=" + backupId + ": " + file);
        }

        try {
            return objectMapper.readValue(file.toFile(), PlayerBackupPayload.class);
        } catch (IOException e) {
            log.warn("Failed to read player backup payload from file {} -> {}", file, e.toString());
            throw new IllegalStateException("Failed to read player backup payload", e);
        }
    }

    @Override
    public BackupDomain.BackupMetadata importWeaponBackup(WeaponBackupPayload incoming) {
        if (incoming == null) {
            throw new IllegalArgumentException("payload must not be null");
        }
        List<Weapon> weapons = incoming.getWeapons() != null ? incoming.getWeapons() : new ArrayList<>();
        BackupDomain.BackupMetadata sourceMeta = incoming.getMetadata();

        BackupDomain.BackupMetadata meta = new BackupDomain.BackupMetadata();
        String id = UUID.randomUUID().toString();
        meta.setId(id);
        meta.setType(BackupDomain.BackupType.WEAPON);
        meta.setLabel(sourceMeta != null ? sourceMeta.getLabel() : null);
        meta.setCreatedAt(Instant.now());
        meta.setSchemaVersion(schemaVersion);
        meta.setWeaponCount((long) weapons.size());
        meta.setPlayerCount(null);
        meta.setWeaponBackupId(null);

        String timestamp = DateTimeFormatter.ISO_INSTANT.format(meta.getCreatedAt()).replace(":", "-");
        String fileName = "weapon-backup-" + timestamp + "-" + id + ".json";
        meta.setFileName(fileName);

        WeaponBackupPayload payload = new WeaponBackupPayload();
        payload.setMetadata(meta);
        payload.setWeapons(weapons);

        Path dir = resolveDir(BackupDomain.BackupType.WEAPON);
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(fileName);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(target.toFile(), payload);
            return meta;
        } catch (IOException e) {
            log.warn("Failed to import weapon backup -> {}", e.toString());
            throw new IllegalStateException("Failed to import weapon backup", e);
        }
    }

    @Override
    public BackupDomain.BackupMetadata importPlayerBackup(PlayerBackupPayload incoming) {
        if (incoming == null) {
            throw new IllegalArgumentException("payload must not be null");
        }

        List<Player> players = incoming.getPlayers() != null ? incoming.getPlayers() : new ArrayList<>();
        List<PlayerInventoryItem> inventoryItems = incoming.getInventoryItems() != null ? incoming.getInventoryItems() : new ArrayList<>();
        List<PlayerSkill> playerSkills = incoming.getPlayerSkills() != null ? incoming.getPlayerSkills() : new ArrayList<>();
        List<PlayerLanguage> languages = incoming.getLanguages() != null ? incoming.getLanguages() : new ArrayList<>();
        List<PlayerSpellList> spellLists = incoming.getSpellLists() != null ? incoming.getSpellLists() : new ArrayList<>();
        List<PlayerAttributeTotal> attributeTotals = incoming.getAttributeTotals() != null ? incoming.getAttributeTotals() : new ArrayList<>();
        List<PlayerBonusAdjustment> bonusAdjustments = incoming.getBonusAdjustments() != null ? incoming.getBonusAdjustments() : new ArrayList<>();
        List<AttackModifier> attackModifiers = incoming.getAttackModifiers() != null ? incoming.getAttackModifiers() : new ArrayList<>();
        List<RangedMagicModifier> rangedMagicModifiers = incoming.getRangedMagicModifiers() != null ? incoming.getRangedMagicModifiers() : new ArrayList<>();

        BackupDomain.BackupMetadata sourceMeta = incoming.getMetadata();

        BackupDomain.BackupMetadata meta = new BackupDomain.BackupMetadata();
        String id = UUID.randomUUID().toString();
        meta.setId(id);
        meta.setType(BackupDomain.BackupType.PLAYER);
        meta.setLabel(sourceMeta != null ? sourceMeta.getLabel() : null);
        meta.setCreatedAt(Instant.now());
        meta.setSchemaVersion(schemaVersion);
        meta.setPlayerCount((long) players.size());
        meta.setWeaponCount(null);
        meta.setWeaponBackupId(sourceMeta != null ? sourceMeta.getWeaponBackupId() : null);

        String timestamp = DateTimeFormatter.ISO_INSTANT.format(meta.getCreatedAt()).replace(":", "-");
        String fileName = "player-backup-" + timestamp + "-" + id + ".json";
        meta.setFileName(fileName);

        PlayerBackupPayload payload = new PlayerBackupPayload();
        payload.setMetadata(meta);
        payload.setPlayers(players);
        payload.setInventoryItems(inventoryItems);
        payload.setPlayerSkills(playerSkills);
        payload.setLanguages(languages);
        payload.setSpellLists(spellLists);
        payload.setAttributeTotals(attributeTotals);
        payload.setBonusAdjustments(bonusAdjustments);
        payload.setAttackModifiers(attackModifiers);
        payload.setRangedMagicModifiers(rangedMagicModifiers);

        Path dir = resolveDir(BackupDomain.BackupType.PLAYER);
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(fileName);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(target.toFile(), payload);
            return meta;
        } catch (IOException e) {
            log.warn("Failed to import player backup -> {}", e.toString());
            throw new IllegalStateException("Failed to import player backup", e);
        }
    }

    @Override
    public void deleteBackup(BackupDomain.BackupType type, String backupId) {
        if (backupId == null || backupId.trim().isEmpty()) {
            throw new IllegalArgumentException("backupId must not be null or empty");
        }
        List<BackupDomain.BackupMetadata> all = listBackups(type);
        BackupDomain.BackupMetadata meta = all.stream()
                .filter(m -> backupId.equals(m.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Backup not found: " + backupId));

        Path dir = resolveDir(type);
        String fileName = meta.getFileName();
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new IllegalStateException("Backup metadata missing fileName for id=" + backupId);
        }
        Path file = dir.resolve(fileName);

        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("Failed to delete backup file {} -> {}", file, e.toString());
            throw new IllegalStateException("Failed to delete backup file", e);
        }
    }

    private Path resolveDir(BackupDomain.BackupType type) {
        if (type == BackupDomain.BackupType.WEAPON) {
            return baseDir.resolve("weapon");
        } else if (type == BackupDomain.BackupType.PLAYER) {
            return baseDir.resolve("player");
        }
        return baseDir;
    }

    private BackupDomain.BackupMetadata readMetadata(BackupDomain.BackupType type, Path file) {
        try {
            if (type == BackupDomain.BackupType.WEAPON) {
                WeaponBackupPayload payload = objectMapper.readValue(file.toFile(), WeaponBackupPayload.class);
                BackupDomain.BackupMetadata meta = payload.getMetadata();
                if (meta != null && meta.getFileName() == null) {
                    meta.setFileName(file.getFileName().toString());
                }
                return meta;
            } else if (type == BackupDomain.BackupType.PLAYER) {
                PlayerBackupPayload payload = objectMapper.readValue(file.toFile(), PlayerBackupPayload.class);
                BackupDomain.BackupMetadata meta = payload.getMetadata();
                if (meta != null && meta.getFileName() == null) {
                    meta.setFileName(file.getFileName().toString());
                }
                return meta;
            }
            return null;
        } catch (IOException e) {
            log.warn("Failed to read backup metadata from file {} -> {}", file, e.toString());
            return null;
        }
    }
}
