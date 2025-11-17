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
public class ClassSkillBonusService {
    private final Logger logger = LoggerFactory.getLogger(getClass());
    private final JdbcTemplate jdbc;

    @Value("${sheet.tablePrefix}")
    private String tablePrefix;

    public ClassSkillBonusService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Map<String, Integer>> findClassBonuses(PlayerClass playerClass) {
        if (playerClass == null) {
            return Optional.empty();
        }
        return findClassBonusesByKey(buildLookupKey(playerClass));
    }

    public Optional<Map<String, Integer>> findClassBonusesByKey(String rawKey) {
        String lookupKey = normalizeKey(rawKey);
        if (lookupKey == null) {
            return Optional.empty();
        }
        String tableName = resolveTableName();
        try {
            Map<String, Integer> result = jdbc.query(
                    "SELECT * FROM " + tableName + " WHERE UPPER(COL1) = ?",
                    ps -> ps.setString(1, lookupKey),
                    rs -> rs.next() ? extractClassBonuses(rs) : null
            );
            return Optional.ofNullable(result);
        } catch (DataAccessException ex) {
            logger.warn("Failed to load {} entry for key {}: {}", tableName, lookupKey, ex.getMessage());
        }
        return Optional.empty();
    }

    private Map<String, Integer> extractClassBonuses(ResultSet rs) throws SQLException {
        Map<String, Integer> bonuses = new LinkedHashMap<>();
        for (int i = 0; i < SkillTableColumnOrder.SKILL_SEQUENCE.size(); i++) {
            int columnIndex = i + 2; // COL2..COL33
            String columnName = "COL" + columnIndex;
            Integer value = parseInteger(rs.getString(columnName));
            bonuses.put(SkillTableColumnOrder.SKILL_SEQUENCE.get(i), value);
        }
        return bonuses;
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
        return (tablePrefix != null ? tablePrefix : "") + "CHAR_CLASSBONUS";
    }
}
