package com.sol.merp.skills;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;

@Component
public class SkillDefinitionInitializer {
    private static final Logger LOGGER = LoggerFactory.getLogger(SkillDefinitionInitializer.class);
    private static final String SKILLS_RESOURCE_PATH = "data/skills.json";

    private final SkillDefinitionRepository repository;
    private final ObjectMapper objectMapper;
    private final PlayerRepository playerRepository;
    private final PlayerSkillRepository playerSkillRepository;

    public SkillDefinitionInitializer(
            SkillDefinitionRepository repository,
            ObjectMapper objectMapper,
            PlayerRepository playerRepository,
            PlayerSkillRepository playerSkillRepository) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.playerRepository = playerRepository;
        this.playerSkillRepository = playerSkillRepository;
    }

    public void ensureSkillDefinitionsSeeded() {
        seedSkillDefinitions();
        ensurePlayerSkills();
    }

    private void seedSkillDefinitions() {
        if (repository.count() > 0) {
            return;
        }

        try (InputStream in = new ClassPathResource(SKILLS_RESOURCE_PATH).getInputStream()) {
            List<SkillSeedRow> seeds = objectMapper.readValue(in, new TypeReference<List<SkillSeedRow>>() {});
            seeds.stream()
                .filter(seed -> seed.getName() != null && !seed.getName().isBlank())
                .map(seed -> SkillDefinition.builder()
                    .name(seed.getName().trim())
                    .category(seed.getCategory() != null ? seed.getCategory().trim() : "General")
                    .attributeKey(seed.getAttributeKey() != null ? seed.getAttributeKey().trim() : null)
                    .build())
                .forEach(repository::save);
            LOGGER.info("Seeded {} skill definitions.", repository.count());
        } catch (IOException e) {
            LOGGER.error("Failed to seed skill definitions from {}", SKILLS_RESOURCE_PATH, e);
        }
    }

    private void ensurePlayerSkills() {
        List<SkillDefinition> definitions = repository.findAll();
        if (definitions.isEmpty()) {
            return;
        }

        List<Player> players = playerRepository.findAll();
        for (Player player : players) {
            for (SkillDefinition definition : definitions) {
                if (!playerSkillRepository.existsByPlayerAndSkillDefinition(player, definition)) {
                    PlayerSkill skill = PlayerSkill.builder()
                        .player(player)
                        .skillDefinition(definition)
                        .build();
                    skill.recomputeTotal();
                    playerSkillRepository.save(skill);
                }
            }
        }
    }

    private static class SkillSeedRow {
        private String name;
        private String category;
        private String attributeKey;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getAttributeKey() {
            return attributeKey;
        }

        public void setAttributeKey(String attributeKey) {
            this.attributeKey = attributeKey;
        }
    }
}
