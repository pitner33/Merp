package com.sol.merp.storage;

import java.util.Locale;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SkillLevelBonusService {
    private final Logger logger = LoggerFactory.getLogger(getClass());
    private final JdbcTemplate jdbc;

    @Value("${sheet.tablePrefix}")
    private String tablePrefix;

    public SkillLevelBonusService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Integer> findSkillLevelBonus(String rawSkillName, int levelCount) {
        if (levelCount <= 0) {
            return Optional.of(0);
        }
        String skillName = normalizeSkillName(rawSkillName);
        if (skillName == null) {
            return Optional.empty();
        }
        String column = resolveColumnForSkill(skillName);
        String tableName = resolveTableName();
        try {
            Integer value = jdbc.query(
                    "SELECT " + column + " FROM " + tableName + " WHERE ROW_KEY = ?",
                    ps -> ps.setInt(1, levelCount),
                    rs -> rs.next() ? parseInteger(rs.getString(1)) : null
            );
            if (value != null) {
                return Optional.of(value);
            }
        } catch (DataAccessException ex) {
            logger.warn("Failed to load {} entry for skill '{}' and level {}: {}", tableName, skillName, levelCount, ex.getMessage());
        }
        return Optional.empty();
    }

    private String resolveColumnForSkill(String skillName) {
        if ("VB".equalsIgnoreCase(skillName)) {
            return "COL3";
        }
        if ("BACKSTAB".equalsIgnoreCase(skillName)) {
            return "COL2";
        }
        return "COL1";
    }

    private String resolveTableName() {
        return (tablePrefix != null ? tablePrefix : "") + "CHAR_SKILLLEVELS";
    }

    private Integer parseInteger(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        try {
            double numeric = Double.parseDouble(text.trim());
            if (Double.isFinite(numeric)) {
                return (int) Math.round(numeric);
            }
        } catch (NumberFormatException ignore) {
            // ignore malformed values
        }
        return 0;
    }

    private String normalizeSkillName(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }
}
