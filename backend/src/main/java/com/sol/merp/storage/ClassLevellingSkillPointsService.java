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

import com.sol.merp.attributes.PlayerClass;

@Service
public class ClassLevellingSkillPointsService {
    private final Logger logger = LoggerFactory.getLogger(getClass());
    private final JdbcTemplate jdbc;

    @Value("${sheet.tablePrefix}")
    private String tablePrefix;

    public ClassLevellingSkillPointsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Map<String, Integer>> findSkillPoints(PlayerClass playerClass) {
        if (playerClass == null) {
            return Optional.empty();
        }
        return findSkillPointsByKey(buildLookupKey(playerClass));
    }

    public Optional<Map<String, Integer>> findSkillPointsByKey(String rawKey) {
        String lookupKey = normalizeKey(rawKey);
        if (lookupKey == null) {
            return Optional.empty();
        }
        String tableName = resolveTableName();
        try {
            Map<String, Integer> result = jdbc.query(
                    "SELECT COL2, COL3, COL4, COL5, COL6, COL7, COL8, COL9 FROM " + tableName + " WHERE UPPER(COL1) = ?",
                    ps -> ps.setString(1, lookupKey),
                    rs -> rs.next() ? extractSkillPoints(rs) : null
            );
            return Optional.ofNullable(result);
        } catch (DataAccessException ex) {
            logger.warn("Failed to load {} entry for key {}: {}", tableName, lookupKey, ex.getMessage());
        }
        return Optional.empty();
    }

    private Map<String, Integer> extractSkillPoints(ResultSet rs) throws SQLException {
        Map<String, Integer> result = new LinkedHashMap<>();
        result.put("mmSkills", parseInteger(rs.getString(1)));
        result.put("weaponSkills", parseInteger(rs.getString(2)));
        result.put("generalSkills", parseInteger(rs.getString(3)));
        result.put("thiefSkills", parseInteger(rs.getString(4)));
        result.put("magicSkills", parseInteger(rs.getString(5)));
        result.put("otherSkills", parseInteger(rs.getString(6)));
        result.put("spells", parseInteger(rs.getString(7)));
        result.put("languages", parseInteger(rs.getString(8)));
        return result;
    }

    private Integer parseInteger(String text) {
        if (text == null || text.isBlank()) {
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

    private String buildLookupKey(PlayerClass playerClass) {
        if (playerClass == null) {
            return null;
        }
        String displayName = playerClass.getDisplayName();
        if (displayName == null || displayName.isBlank()) {
            return playerClass.name().toUpperCase(Locale.ROOT);
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
        return (tablePrefix != null ? tablePrefix : "") + "CHAR_LEVELLINGSP";
    }
}
