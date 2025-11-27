package com.sol.merp.storage;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.sol.merp.attributes.Race;

@Service
public class ChildhoodSkillPresetService {
    private final Logger logger = LoggerFactory.getLogger(getClass());
    private final JdbcTemplate jdbc;

    @Value("${sheet.tablePrefix}")
    private String tablePrefix;

    public ChildhoodSkillPresetService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<ChildhoodSkillsData> findChildhoodSkills(Race race) {
        if (race == null) {
            return Optional.empty();
        }
        return findChildhoodSkillsByKey(buildLookupKey(race));
    }

    public Optional<ChildhoodSkillsData> findChildhoodSkillsByKey(String rawKey) {
        String lookupKey = normalizeKey(rawKey);
        if (lookupKey == null) {
            return Optional.empty();
        }
        String tableName = resolveTableName();
        try {
            ChildhoodSkillsData result = jdbc.query(
                    "SELECT * FROM " + tableName + " WHERE UPPER(COL1) = ?",
                    ps -> ps.setString(1, lookupKey),
                    rs -> rs.next() ? extractChildhoodSkills(rs) : null
            );
            return Optional.ofNullable(result);
        } catch (DataAccessException ex) {
            logger.warn("Failed to load {} entry for key {}: {}", tableName, lookupKey, ex.getMessage());
        }
        return Optional.empty();
    }

    private ChildhoodSkillsData extractChildhoodSkills(ResultSet rs) throws SQLException {
        Map<String, Integer> result = new LinkedHashMap<>();
        for (int i = 0; i < SkillTableColumnOrder.SKILL_SEQUENCE.size(); i++) {
            int columnIndex = i + 2; // COL2..COL33
            String columnName = "COL" + columnIndex;
            Integer value = parseInteger(rs.getString(columnName));
            result.put(SkillTableColumnOrder.SKILL_SEQUENCE.get(i), value);
        }
        int spellLearningChancePercent = parseInteger(rs.getString("COL34"));
        int languageLevels = parseInteger(rs.getString("COL35"));
        int backgroundPossibilities = parseInteger(rs.getString("COL36"));
        return new ChildhoodSkillsData(result, spellLearningChancePercent, languageLevels, backgroundPossibilities);
    }

    private Integer parseInteger(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        try {
            double numeric = Double.parseDouble(text.trim());
            if (Double.isFinite(numeric)) {
                return (int) Math.max(0, Math.round(numeric));
            }
        } catch (NumberFormatException ignore) {
            // ignore malformed values
        }
        return 0;
    }

    public static class ChildhoodSkillsData {
        private final Map<String, Integer> skills;
        private final int spellLearningChancePercent;
        private final int languageLevels;
        private final int backgroundPossibilities;

        public ChildhoodSkillsData(Map<String, Integer> skills,
                                   int spellLearningChancePercent,
                                   int languageLevels,
                                   int backgroundPossibilities) {
            this.skills = skills;
            this.spellLearningChancePercent = spellLearningChancePercent;
            this.languageLevels = languageLevels;
            this.backgroundPossibilities = backgroundPossibilities;
        }

        public Map<String, Integer> getSkills() {
            return skills;
        }

        public int getSpellLearningChancePercent() {
            return spellLearningChancePercent;
        }

        public int getLanguageLevels() {
            return languageLevels;
        }

        public int getBackgroundPossibilities() {
            return backgroundPossibilities;
        }
    }

    private String buildLookupKey(Race race) {
        if (race == null) {
            return null;
        }
        if (race.name().toLowerCase(Locale.ROOT).startsWith("human")) {
            return "HUMAN";
        }
        String displayName = race.getDisplayName();
        if (displayName == null || displayName.isBlank()) {
            return race.name().toUpperCase(Locale.ROOT);
        }
        return displayName.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeKey(String key) {
        if (key == null) {
            return null;
        }
        String trimmed = key.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }

    private String resolveTableName() {
        return (tablePrefix != null ? tablePrefix : "") + "CHAR_CHILDHOODSP";
    }
}
