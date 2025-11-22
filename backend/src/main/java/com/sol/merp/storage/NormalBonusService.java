package com.sol.merp.storage;

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
import java.util.OptionalInt;

@Service
public class NormalBonusService {
    private final Logger logger = LoggerFactory.getLogger(getClass());
    private final JdbcTemplate jdbc;

    @Value("${sheet.tablePrefix}")
    private String tablePrefix;

    public NormalBonusService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Integer> getNormalBonuses() {
        String tableName = resolveTableName();
        Map<String, Integer> bonuses = new LinkedHashMap<>();
        try {
            jdbc.query("SELECT * FROM " + tableName + " ORDER BY ROW_KEY", rs -> {
                try {
                    int rowKey = rs.getInt("ROW_KEY");
                    Integer value = parseInteger(safeTrim(rs.getString("COL1")));
                    if (value == null) {
                        value = 0;
                    }
                    bonuses.put(String.valueOf(rowKey), value);
                } catch (SQLException sqlException) {
                    logger.warn("Failed to process CHAR_NORMALBONUS row: {}", sqlException.getMessage());
                }
            });
        } catch (DataAccessException ex) {
            logger.warn("Failed to load CHAR_NORMALBONUS table '{}': {}", tableName, ex.getMessage());
        }
        return bonuses;
    }

    public OptionalInt findNormalBonusForValue(int attributeValue) {
        if (attributeValue <= 0) {
            return OptionalInt.empty();
        }
        String tableName = resolveTableName();
        try {
            Integer result = jdbc.query(
                    "SELECT * FROM " + tableName + " WHERE ROW_KEY = ?",
                    ps -> ps.setInt(1, attributeValue),
                    rs -> {
                        if (!rs.next()) {
                            return null;
                        }
                        try {
                            Integer value = parseInteger(safeTrim(rs.getString("COL1")));
                            return value != null ? value : 0;
                        } catch (SQLException sqlException) {
                            logger.warn("Failed to process CHAR_NORMALBONUS row for value {}: {}", attributeValue, sqlException.getMessage());
                            return 0;
                        }
                    }
            );
            if (result != null) {
                return OptionalInt.of(result);
            }
        } catch (DataAccessException ex) {
            logger.warn("Failed to load CHAR_NORMALBONUS entry for value {}: {}", attributeValue, ex.getMessage());
        }
        return OptionalInt.empty();
    }

    public OptionalInt findManaBonusForValue(int attributeValue) {
        if (attributeValue <= 0) {
            return OptionalInt.empty();
        }
        String tableName = resolveTableName();
        try {
            Integer result = jdbc.query(
                    "SELECT * FROM " + tableName + " WHERE ROW_KEY = ?",
                    ps -> ps.setInt(1, attributeValue),
                    rs -> {
                        if (!rs.next()) {
                            return null;
                        }
                        try {
                            Integer value = parseInteger(safeTrim(rs.getString("COL2")));
                            return value != null ? value : 0;
                        } catch (SQLException sqlException) {
                            logger.warn("Failed to process CHAR_NORMALBONUS mana row for value {}: {}", attributeValue, sqlException.getMessage());
                            return 0;
                        }
                    }
            );
            if (result != null) {
                return OptionalInt.of(result);
            }
        } catch (DataAccessException ex) {
            logger.warn("Failed to load CHAR_NORMALBONUS mana entry for value {}: {}", attributeValue, ex.getMessage());
        }
        return OptionalInt.empty();
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
        return (tablePrefix != null ? tablePrefix : "") + "CHAR_NORMALBONUS";
    }
}
