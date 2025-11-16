package com.sol.merp.storage;

import com.sol.merp.attributes.Race;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class RaceBonusService {
    private static final String[] ATTRIBUTES = {"STR", "DEX", "CON", "IQ", "IT", "CH"};

    private final Logger logger = LoggerFactory.getLogger(getClass());
    private final JdbcTemplate jdbc;

    @Value("${sheet.tablePrefix}")
    private String tablePrefix;

    public RaceBonusService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Map<String, Integer>> findRaceBonuses(Race race) {
        if (race == null) {
            return Optional.empty();
        }
        String lookupKey = buildLookupKey(race);
        return findRaceBonusesByKey(lookupKey);
    }

    public Optional<Map<String, Integer>> findRaceBonusesByKey(String rawKey) {
        String lookupKey = normalizeKey(rawKey);
        if (lookupKey == null) {
            return Optional.empty();
        }
        String tableName = resolveTableName();
        try {
            Map<String, Integer> bonuses = jdbc.query(
                    "SELECT * FROM " + tableName + " WHERE UPPER(COL1) = ?",
                    ps -> ps.setString(1, lookupKey),
                    rs -> rs.next() ? extractBonuses(rs) : null
            );
            return Optional.ofNullable(bonuses);
        } catch (DataAccessException ex) {
            logger.warn("Failed to load CHAR_RACEBONUS entry for key {}: {}", lookupKey, ex.getMessage());
        }
        return Optional.empty();
    }

    private Map<String, Integer> extractBonuses(ResultSet rs) throws SQLException {
        Map<String, Integer> bonuses = new LinkedHashMap<>();
        for (int i = 0; i < ATTRIBUTES.length; i++) {
            int primaryColumnIndex = i + 2; // STR starts at COL2 (COL1 is lookup key)
            Integer value = parseInteger(safeTrim(rs.getString("COL" + primaryColumnIndex)));
            if (value == null) {
                value = 0;
            }
            bonuses.put(ATTRIBUTES[i], value);
        }
        return bonuses;
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

    private Integer parseInteger(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }
        try {
            double numeric = Double.parseDouble(text);
            if (Double.isFinite(numeric)) {
                return (int) Math.round(numeric);
            }
        } catch (NumberFormatException ignore) {
            // ignore malformed values
        }
        return null;
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }

    private String resolveTableName() {
        return (tablePrefix != null ? tablePrefix : "") + "CHAR_RACEBONUS";
    }
}
