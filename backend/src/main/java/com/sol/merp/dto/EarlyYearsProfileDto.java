package com.sol.merp.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EarlyYearsProfileDto {

    @Builder.Default
    private BaseDataDto baseData = new BaseDataDto();

    @Builder.Default
    private List<AttributeTotalDto> attributes = new ArrayList<>();

    @Builder.Default
    private List<SpellListDto> spellLists = new ArrayList<>();

    @Builder.Default
    private List<LanguageDto> languages = new ArrayList<>();

    @Builder.Default
    private List<BonusAdjustmentDto> bonusAdjustments = new ArrayList<>();

    @Builder.Default
    private List<SkillRowDto> skills = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BaseDataDto {
        private String characterId;
        private String name;
        private String gender;
        private String race;
        private String playerClass;
        private String magicSchool;
        private String age;
        private String height;
        private String weight;
        private String hair;
        private String eyes;
        private String personality;
        private String alignment;
        private String motivation;
        private String specialty;
        private String armorType;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SpellListDto {
        private Long id;
        private String name;
        private Integer chance;
        private Boolean learnt;
        private Integer displayOrder;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LanguageDto {
        private Long id;
        private String name;
        private Integer level;
        private Integer displayOrder;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AttributeTotalDto {
        private String attributeKey;
        private Integer baseValue;
        private Integer normalBonus;
        private Integer raceBonus;
        private Integer totalBonus;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BonusAdjustmentDto {
        private Long id;
        private String bonusKey;
        private String label;
        private String attributeKey;
        private Integer attributeBonus;
        private Integer itemBonus;
        private Integer specialBonus;
        private Integer totalBonus;
        private Integer displayOrder;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SkillRowDto {
        private Long skillDefinitionId;
        private String skillName;
        private Integer levelBonus;
        private Integer levelCount;
        private String levelsMask;
        private Integer attributeBonus;
        private Integer classBonus;
        private Integer itemBonus;
        private Integer specialBonus;
        private Integer totalBonus;
        private Integer manualLevelInput;
    }
}
