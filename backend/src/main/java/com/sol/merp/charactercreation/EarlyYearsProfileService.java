package com.sol.merp.charactercreation;

import com.sol.merp.attributes.ArmorType;
import com.sol.merp.attributes.Gender;
import com.sol.merp.attributes.PlayerClass;
import com.sol.merp.attributes.Race;
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
import com.sol.merp.dto.EarlyYearsProfileDto;
import com.sol.merp.skills.PlayerSkill;
import com.sol.merp.skills.PlayerSkillRepository;
import com.sol.merp.skills.SkillDefinition;
import com.sol.merp.skills.SkillDefinitionRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class EarlyYearsProfileService {

    private final PlayerRepository playerRepository;
    private final PlayerSpellListRepository playerSpellListRepository;
    private final PlayerLanguageRepository playerLanguageRepository;
    private final PlayerAttributeTotalRepository playerAttributeTotalRepository;
    private final PlayerBonusAdjustmentRepository playerBonusAdjustmentRepository;
    private final PlayerSkillRepository playerSkillRepository;
    private final SkillDefinitionRepository skillDefinitionRepository;

    public EarlyYearsProfileService(PlayerRepository playerRepository,
                                    PlayerSpellListRepository playerSpellListRepository,
                                    PlayerLanguageRepository playerLanguageRepository,
                                    PlayerAttributeTotalRepository playerAttributeTotalRepository,
                                    PlayerBonusAdjustmentRepository playerBonusAdjustmentRepository,
                                    PlayerSkillRepository playerSkillRepository,
                                    SkillDefinitionRepository skillDefinitionRepository) {
        this.playerRepository = playerRepository;
        this.playerSpellListRepository = playerSpellListRepository;
        this.playerLanguageRepository = playerLanguageRepository;
        this.playerAttributeTotalRepository = playerAttributeTotalRepository;
        this.playerBonusAdjustmentRepository = playerBonusAdjustmentRepository;
        this.playerSkillRepository = playerSkillRepository;
        this.skillDefinitionRepository = skillDefinitionRepository;
    }

    @Transactional
    public EarlyYearsProfileDto saveProfile(Long playerId, EarlyYearsProfileDto payload) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + playerId));

        applyBaseData(player, payload.getBaseData());
        replaceSpellLists(player, payload.getSpellLists());
        replaceLanguages(player, payload.getLanguages());
        replaceAttributeTotals(player, payload.getAttributes());
        replaceBonusAdjustments(player, payload.getBonusAdjustments());
        updateSkillRows(player, payload.getSkills());

        applyAggregatedStats(player, payload);

        playerRepository.save(player);
        return loadProfile(playerId);
    }

    @Transactional
    public EarlyYearsProfileDto loadProfile(Long playerId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + playerId));

        EarlyYearsProfileDto.BaseDataDto baseData = EarlyYearsProfileDto.BaseDataDto.builder()
                .characterId(player.getCharacterId())
                .name(player.getName())
                .gender(enumToString(player.getGender()))
                .race(enumToString(player.getRace()))
                .playerClass(enumToString(player.getPlayerClass()))
                .magicSchool(player.getMagicSchool())
                .age(player.getAge())
                .height(player.getHeight())
                .weight(player.getWeight())
                .hair(player.getHair())
                .eyes(player.getEyes())
                .personality(player.getPersonality())
                .alignment(player.getAlignment())
                .motivation(player.getMotivation())
                .specialty(player.getSpecialty())
                .armorType(enumToString(player.getArmorType()))
                .build();

        List<EarlyYearsProfileDto.SpellListDto> spellLists = playerSpellListRepository.findByPlayer_IdOrderByDisplayOrderAsc(playerId)
                .stream()
                .map(entity -> EarlyYearsProfileDto.SpellListDto.builder()
                        .id(entity.getId())
                        .name(entity.getName())
                        .chance(entity.getChance())
                        .learnt(entity.isLearnt())
                        .displayOrder(entity.getDisplayOrder())
                        .build())
                .toList();

        List<EarlyYearsProfileDto.LanguageDto> languages = playerLanguageRepository.findByPlayer_IdOrderByDisplayOrderAsc(playerId)
                .stream()
                .map(entity -> EarlyYearsProfileDto.LanguageDto.builder()
                        .id(entity.getId())
                        .name(entity.getName())
                        .level(entity.getLevel())
                        .displayOrder(entity.getDisplayOrder())
                        .build())
                .toList();

        List<EarlyYearsProfileDto.AttributeTotalDto> attributes = playerAttributeTotalRepository.findByPlayer_Id(playerId)
                .stream()
                .sorted(Comparator.comparing(PlayerAttributeTotal::getAttributeKey, String.CASE_INSENSITIVE_ORDER))
                .map(entity -> EarlyYearsProfileDto.AttributeTotalDto.builder()
                        .attributeKey(entity.getAttributeKey())
                        .baseValue(entity.getBaseValue())
                        .normalBonus(entity.getNormalBonus())
                        .raceBonus(entity.getRaceBonus())
                        .totalBonus(entity.getTotalBonus())
                        .build())
                .toList();

        List<EarlyYearsProfileDto.BonusAdjustmentDto> bonusAdjustments = playerBonusAdjustmentRepository.findByPlayer_IdOrderByDisplayOrderAsc(playerId)
                .stream()
                .map(entity -> EarlyYearsProfileDto.BonusAdjustmentDto.builder()
                        .id(entity.getId())
                        .bonusKey(entity.getBonusKey())
                        .label(entity.getLabel())
                        .attributeKey(entity.getAttributeKey())
                        .attributeBonus(entity.getAttributeBonus())
                        .itemBonus(entity.getItemBonus())
                        .specialBonus(entity.getSpecialBonus())
                        .totalBonus(entity.getTotalBonus())
                        .displayOrder(entity.getDisplayOrder())
                        .build())
                .toList();

        List<EarlyYearsProfileDto.SkillRowDto> skills = playerSkillRepository.findByPlayer_Id(playerId)
                .stream()
                .map(entity -> EarlyYearsProfileDto.SkillRowDto.builder()
                        .skillDefinitionId(entity.getSkillDefinition() != null ? entity.getSkillDefinition().getId() : null)
                        .skillName(entity.getSkillDefinition() != null ? entity.getSkillDefinition().getName() : null)
                        .levelBonus(entity.getLevelBonus())
                        .levelCount(entity.getLevelCount())
                        .levelsMask(entity.getLevelsMask())
                        .attributeBonus(entity.getAttributeBonus())
                        .classBonus(entity.getClassBonus())
                        .itemBonus(entity.getItemBonus())
                        .specialBonus(entity.getSpecialBonus())
                        .totalBonus(entity.getTotalBonus())
                        .manualLevelInput(entity.getManualLevelInput())
                        .build())
                .toList();

        return EarlyYearsProfileDto.builder()
                .baseData(baseData)
                .spellLists(spellLists)
                .languages(languages)
                .attributes(attributes)
                .bonusAdjustments(bonusAdjustments)
                .skills(skills)
                .build();
    }

    private void applyAggregatedStats(Player player, EarlyYearsProfileDto payload) {
        if (player == null || payload == null) {
            return;
        }

        Map<String, Integer> skillTotals = new HashMap<>();
        List<EarlyYearsProfileDto.SkillRowDto> skillRows = payload.getSkills();
        if (skillRows != null) {
            for (EarlyYearsProfileDto.SkillRowDto row : skillRows) {
                if (row == null) {
                    continue;
                }
                String name = trimToNull(row.getSkillName());
                if (name == null) {
                    continue;
                }
                String key = name.trim().toUpperCase(Locale.ROOT);
                skillTotals.put(key, defaultValue(row.getTotalBonus()));
            }
        }

        Integer mmNone = skillTotals.get("NONE");
        if (mmNone != null) player.setMmNone(mmNone);
        Integer mmLeather = skillTotals.get("LEATHER");
        if (mmLeather != null) player.setMmLeather(mmLeather);
        Integer mmHeavyLeather = skillTotals.get("HEAVY LEATHER");
        if (mmHeavyLeather != null) player.setMmHeavyLeather(mmHeavyLeather);
        Integer mmChainmail = skillTotals.get("CHAINMAIL");
        if (mmChainmail != null) player.setMmChainmail(mmChainmail);
        Integer mmPlate = skillTotals.get("PLATE");
        if (mmPlate != null) player.setMmPlate(mmPlate);

        Integer tbSlashing = skillTotals.get("SLASHING");
        if (tbSlashing != null) player.setTb1HSlashing(tbSlashing);
        Integer tbBlunt = skillTotals.get("BLUNT");
        if (tbBlunt != null) player.setTb1HBlunt(tbBlunt);
        Integer tbTwoHanded = skillTotals.get("TWO-HANDED");
        if (tbTwoHanded != null) player.setTbTwoHanded(tbTwoHanded);
        Integer tbRanged = skillTotals.get("RANGED");
        if (tbRanged != null) player.setTbRanged(tbRanged);
        Integer tbUnarmed = skillTotals.get("UNARMED COMBAT");
        if (tbUnarmed != null) player.setTbUnarmed(tbUnarmed);

        Integer dualWield = skillTotals.get("DUAL WIELD");
        if (dualWield != null) player.setDualWield(dualWield);
        Integer vb = skillTotals.get("VB");
        if (vb != null) player.setVb(vb);

        Integer tbBaseMagic = skillTotals.get("BASE MAGIC");
        if (tbBaseMagic != null) player.setTbBaseMagic(tbBaseMagic);
        Integer tbTargetMagic = skillTotals.get("TARGET MAGIC");
        if (tbTargetMagic != null) player.setTbTargetMagic(tbTargetMagic);

        Integer perception = skillTotals.get("PERCEPTION");
        if (perception != null) player.setPerception(perception);
        Integer tracking = skillTotals.get("TRACKING");
        if (tracking != null) player.setTracking(tracking);
        Integer lockPicking = skillTotals.get("LOCKPICKING");
        if (lockPicking != null) player.setLockPicking(lockPicking);
        Integer disarmTraps = skillTotals.get("DISARM TRAPS");
        if (disarmTraps != null) player.setDisarmTraps(disarmTraps);
        Integer objectUsage = skillTotals.get("OBJECT USAGE");
        if (objectUsage != null) player.setObjectUsage(objectUsage);
        Integer runes = skillTotals.get("RUNES");
        if (runes != null) player.setRunes(runes);
        Integer influence = skillTotals.get("INFLUENCE");
        if (influence != null) player.setInfluence(influence);
        Integer stealth = skillTotals.get("STEALTH");
        if (stealth != null) player.setStealth(stealth);

        Integer climbing = skillTotals.get("CLIMBING");
        if (climbing != null) player.setClimbing(climbing);
        Integer riding = skillTotals.get("RIDING");
        if (riding != null) player.setRiding(riding);
        Integer swimming = skillTotals.get("SWIMMING");
        if (swimming != null) player.setSwimming(swimming);
        Integer backstab = skillTotals.get("BACKSTAB");
        if (backstab != null) player.setBackstab(backstab);
        Integer acrobatics = skillTotals.get("ACROBATICS");
        if (acrobatics != null) player.setAcrobatics(acrobatics);
        Integer ships = skillTotals.get("SHIPS");
        if (ships != null) player.setShips(ships);
        Integer caving = skillTotals.get("CAVING");
        if (caving != null) player.setCaving(caving);
        Integer firstAid = skillTotals.get("FIRST AID");
        if (firstAid != null) player.setFirstAid(firstAid);
        Integer cooking = skillTotals.get("COOKING");
        if (cooking != null) player.setCooking(cooking);
        Integer ropes = skillTotals.get("ROPES");
        if (ropes != null) player.setRopes(ropes);

        EarlyYearsProfileDto.SkillRowDto hpRow = null;
        if (skillRows != null) {
            for (EarlyYearsProfileDto.SkillRowDto row : skillRows) {
                if (row == null) {
                    continue;
                }
                String name = trimToNull(row.getSkillName());
                if (name != null && name.trim().equalsIgnoreCase("HP max")) {
                    hpRow = row;
                    break;
                }
            }
        }
        if (hpRow != null) {
            int hp = defaultValue(hpRow.getTotalBonus());
            double hpMax = Math.max(0, hp);
            player.setHpMax(hpMax);
            player.setHpActual(hpMax);
            player.setIsAlive(true);
        }

        List<EarlyYearsProfileDto.AttributeTotalDto> attributes = payload.getAttributes();
        if (attributes != null) {
            for (EarlyYearsProfileDto.AttributeTotalDto attr : attributes) {
                if (attr == null) {
                    continue;
                }
                String key = trimToNull(attr.getAttributeKey());
                if (key != null && key.trim().equalsIgnoreCase("DEX")) {
                    Integer total = attr.getTotalBonus() != null ? attr.getTotalBonus() : attr.getNormalBonus();
                    if (total != null) {
                        player.setAgilityBonus(total);
                    }
                    break;
                }
            }
        }

        Map<String, EarlyYearsProfileDto.BonusAdjustmentDto> bonuses = new HashMap<>();
        List<EarlyYearsProfileDto.BonusAdjustmentDto> bonusRows = payload.getBonusAdjustments();
        if (bonusRows != null) {
            for (EarlyYearsProfileDto.BonusAdjustmentDto row : bonusRows) {
                if (row == null) {
                    continue;
                }
                String key = trimToNull(row.getBonusKey());
                if (key != null) {
                    bonuses.put(key.toLowerCase(Locale.ROOT), row);
                }
                String label = trimToNull(row.getLabel());
                if (label != null) {
                    bonuses.put(label.toLowerCase(Locale.ROOT), row);
                }
            }
        }

        EarlyYearsProfileDto.BonusAdjustmentDto manaRow = bonuses.get("mana");
        if (manaRow != null) {
            player.setTotalManaBonus(defaultValue(manaRow.getTotalBonus()));
        }

        EarlyYearsProfileDto.BonusAdjustmentDto essenceMd = bonuses.get("essence-md-bonus");
        if (essenceMd == null) {
            essenceMd = bonuses.get("essence md bonus");
        }
        if (essenceMd != null) {
            player.setMdLenyeg(defaultValue(essenceMd.getTotalBonus()));
        }

        EarlyYearsProfileDto.BonusAdjustmentDto channelMd = bonuses.get("chanelling-md-bonus");
        if (channelMd == null) {
            channelMd = bonuses.get("chanelling md bonus");
        }
        if (channelMd != null) {
            player.setMdKapcsolat(defaultValue(channelMd.getTotalBonus()));
        }

        EarlyYearsProfileDto.BonusAdjustmentDto poisonMd = bonuses.get("poison-md-bonus");
        if (poisonMd == null) {
            poisonMd = bonuses.get("poison md bonus");
        }
        if (poisonMd != null) {
            player.setTotalPoisonMdBonus(defaultValue(poisonMd.getTotalBonus()));
        }

        EarlyYearsProfileDto.BonusAdjustmentDto diseaseMd = bonuses.get("disease-md-bonus");
        if (diseaseMd == null) {
            diseaseMd = bonuses.get("disease md bonus");
        }
        if (diseaseMd != null) {
            player.setTotalDiseaseMdBonus(defaultValue(diseaseMd.getTotalBonus()));
        }
    }

    private void applyBaseData(Player player, EarlyYearsProfileDto.BaseDataDto baseData) {
        if (baseData == null) {
            return;
        }
        player.setName(trimToNull(baseData.getName()));
        player.setGender(parseEnum(Gender.class, baseData.getGender()));
        player.setRace(parseEnum(Race.class, baseData.getRace()));
        player.setPlayerClass(parseEnum(PlayerClass.class, baseData.getPlayerClass()));
        player.setMagicSchool(trimToEmpty(baseData.getMagicSchool()));
        player.setAge(trimToEmpty(baseData.getAge()));
        player.setHeight(trimToEmpty(baseData.getHeight()));
        player.setWeight(trimToEmpty(baseData.getWeight()));
        player.setHair(trimToEmpty(baseData.getHair()));
        player.setEyes(trimToEmpty(baseData.getEyes()));
        player.setPersonality(trimToEmpty(baseData.getPersonality()));
        player.setAlignment(trimToEmpty(baseData.getAlignment()));
        player.setMotivation(trimToEmpty(baseData.getMotivation()));
        player.setSpecialty(trimToEmpty(baseData.getSpecialty()));
        ArmorType armorType = parseEnum(ArmorType.class, baseData.getArmorType());
        player.setArmorType(armorType != null ? armorType : ArmorType.none);
    }

    private void replaceSpellLists(Player player, List<EarlyYearsProfileDto.SpellListDto> rows) {
        playerSpellListRepository.deleteByPlayer_Id(player.getId());
        if (rows == null || rows.isEmpty()) {
            return;
        }
        List<PlayerSpellList> entities = new ArrayList<>();
        int index = 0;
        for (EarlyYearsProfileDto.SpellListDto row : rows) {
            if (row == null) {
                continue;
            }
            String name = trimToNull(row.getName());
            Integer chance = row.getChance();
            boolean learnt = Boolean.TRUE.equals(row.getLearnt());
            if (name == null && (chance == null || chance == 0) && !learnt) {
                continue;
            }
            PlayerSpellList entity = PlayerSpellList.builder()
                    .player(player)
                    .name(name != null ? name : "")
                    .chance(chance != null ? chance : 0)
                    .learnt(learnt)
                    .displayOrder(row.getDisplayOrder() != null ? row.getDisplayOrder() : index)
                    .build();
            entities.add(entity);
            index++;
        }
        if (!entities.isEmpty()) {
            playerSpellListRepository.saveAll(entities);
        }
    }

    private void replaceLanguages(Player player, List<EarlyYearsProfileDto.LanguageDto> rows) {
        playerLanguageRepository.deleteByPlayer_Id(player.getId());
        if (rows == null || rows.isEmpty()) {
            return;
        }
        List<PlayerLanguage> entities = new ArrayList<>();
        int index = 0;
        for (EarlyYearsProfileDto.LanguageDto row : rows) {
            if (row == null) {
                continue;
            }
            String name = trimToNull(row.getName());
            Integer level = row.getLevel();
            if (name == null && (level == null || level == 0)) {
                continue;
            }
            PlayerLanguage entity = PlayerLanguage.builder()
                    .player(player)
                    .name(name != null ? name : "")
                    .level(level != null ? level : 0)
                    .displayOrder(row.getDisplayOrder() != null ? row.getDisplayOrder() : index)
                    .build();
            entities.add(entity);
            index++;
        }
        if (!entities.isEmpty()) {
            playerLanguageRepository.saveAll(entities);
        }
    }

    private void replaceAttributeTotals(Player player, List<EarlyYearsProfileDto.AttributeTotalDto> rows) {
        playerAttributeTotalRepository.deleteByPlayer_Id(player.getId());
        if (rows == null || rows.isEmpty()) {
            return;
        }
        List<PlayerAttributeTotal> entities = rows.stream()
                .filter(Objects::nonNull)
                .filter(row -> trimToNull(row.getAttributeKey()) != null)
                .map(row -> PlayerAttributeTotal.builder()
                        .player(player)
                        .attributeKey(trimToNull(row.getAttributeKey()))
                        .baseValue(row.getBaseValue())
                        .normalBonus(row.getNormalBonus())
                        .raceBonus(row.getRaceBonus())
                        .totalBonus(row.getTotalBonus())
                        .build())
                .toList();
        if (!entities.isEmpty()) {
            playerAttributeTotalRepository.saveAll(entities);
        }
    }

    private void replaceBonusAdjustments(Player player, List<EarlyYearsProfileDto.BonusAdjustmentDto> rows) {
        playerBonusAdjustmentRepository.deleteByPlayer_Id(player.getId());
        if (rows == null || rows.isEmpty()) {
            return;
        }
        List<PlayerBonusAdjustment> entities = new ArrayList<>();
        int index = 0;
        for (EarlyYearsProfileDto.BonusAdjustmentDto row : rows) {
            if (row == null) {
                continue;
            }
            String key = trimToNull(row.getBonusKey());
            String label = trimToNull(row.getLabel());
            if (key == null && label == null) {
                continue;
            }
            PlayerBonusAdjustment entity = PlayerBonusAdjustment.builder()
                    .player(player)
                    .bonusKey(key != null ? key : (label != null ? label.toLowerCase(Locale.ROOT).replaceAll("\\s+", "-") : "bonus-" + index))
                    .label(label != null ? label : "")
                    .attributeKey(trimToNull(row.getAttributeKey()))
                    .attributeBonus(row.getAttributeBonus())
                    .itemBonus(row.getItemBonus())
                    .specialBonus(row.getSpecialBonus())
                    .totalBonus(row.getTotalBonus())
                    .displayOrder(row.getDisplayOrder() != null ? row.getDisplayOrder() : index)
                    .build();
            entities.add(entity);
            index++;
        }
        if (!entities.isEmpty()) {
            playerBonusAdjustmentRepository.saveAll(entities);
        }
    }

    private void updateSkillRows(Player player, List<EarlyYearsProfileDto.SkillRowDto> rows) {
        if (rows == null || rows.isEmpty()) {
            return;
        }
        List<PlayerSkill> existingSkills = playerSkillRepository.findByPlayer_Id(player.getId());
        Map<Long, PlayerSkill> skillsByDefinitionId = existingSkills.stream()
                .filter(skill -> skill.getSkillDefinition() != null && skill.getSkillDefinition().getId() != null)
                .collect(Collectors.toMap(skill -> skill.getSkillDefinition().getId(), skill -> skill, (a, b) -> a));

        List<PlayerSkill> toSave = new ArrayList<>();
        for (EarlyYearsProfileDto.SkillRowDto row : rows) {
            if (row == null) {
                continue;
            }
            SkillDefinition definition = resolveSkillDefinition(row);
            if (definition == null) {
                continue;
            }
            PlayerSkill skill = skillsByDefinitionId.get(definition.getId());
            if (skill == null) {
                skill = PlayerSkill.builder()
                        .player(player)
                        .skillDefinition(definition)
                        .build();
            }
            skill.setLevelBonus(defaultValue(row.getLevelBonus()));
            skill.setLevelCount(defaultValue(row.getLevelCount()));
            skill.setLevelsMask(trimToEmpty(row.getLevelsMask()));
            skill.setAttributeBonus(defaultValue(row.getAttributeBonus()));
            skill.setClassBonus(defaultValue(row.getClassBonus()));
            skill.setItemBonus(defaultValue(row.getItemBonus()));
            skill.setSpecialBonus(defaultValue(row.getSpecialBonus()));
            skill.setTotalBonus(defaultValue(row.getTotalBonus()));
            skill.setManualLevelInput(row.getManualLevelInput());
            toSave.add(skill);
        }
        if (!toSave.isEmpty()) {
            playerSkillRepository.saveAll(toSave);
        }
    }

    private SkillDefinition resolveSkillDefinition(EarlyYearsProfileDto.SkillRowDto row) {
        if (row.getSkillDefinitionId() != null) {
            Optional<SkillDefinition> byId = skillDefinitionRepository.findById(row.getSkillDefinitionId());
            if (byId.isPresent()) {
                return byId.get();
            }
        }
        String name = trimToNull(row.getSkillName());
        if (name == null) {
            return null;
        }
        return skillDefinitionRepository.findByNameIgnoreCase(name).orElse(null);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private <E extends Enum<E>> String enumToString(E value) {
        return value == null ? null : value.name();
    }

    private <E extends Enum<E>> E parseEnum(Class<E> type, String raw) {
        String value = trimToNull(raw);
        if (value == null) {
            return null;
        }
        try {
            return Enum.valueOf(type, value);
        } catch (IllegalArgumentException ex) {
            try {
                return Enum.valueOf(type, value.toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ignore) {
                return null;
            }
        }
    }

    private int defaultValue(Integer value) {
        return value != null ? value : 0;
    }
}
