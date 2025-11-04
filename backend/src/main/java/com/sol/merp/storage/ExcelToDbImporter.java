package com.sol.merp.storage;

import com.google.api.services.sheets.v4.model.ValueRange;
import com.sol.merp.googlesheetloader.ExcelSheetLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.*;

@Component
public class ExcelToDbImporter {
    private final Logger logger = LoggerFactory.getLogger(getClass());

    private final JdbcTemplate jdbc;

    @Value("${sheet.xlsxPath}")
    private String xlsxPath;

    @Value("${sheet.tablePrefix}")
    private String tablePrefix;

    public ExcelToDbImporter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    public void importOnce() {
        ensureStatusTable();
        boolean alreadyImported = alreadyImported();
        try {
            Map<String,Integer> maxCols = new LinkedHashMap<>();
            List<String> allTabs = Arrays.asList(
                    "Slashing","Blunt","Twohanded","Ranged","ClawsAndFangs","GrabOrBalance",
                    "MagicProjectile","MagicBall","BaseMagic","BaseMagicMD",
                    "Critical_Slashing","Critical_Blunt","Critical_Piercing","Critical_Heat","Critical_Cold",
                    "Critical_Electricity","Critical_Balance","Critical_Crushing","Critical_Grab",
                    "Critical_BigCreaturePhisical","Critical_BigCreatureMagic",
                    "Fail","MM","OtherManeuver"
            );
            List<String> tabs = alreadyImported ? findMissingTabs(allTabs) : allTabs;
            if (tabs.isEmpty()) {
                logger.info("Excel data already present for all tabs, skipping import.");
                return;
            }
            if (alreadyImported) {
                logger.info("Missing/empty tables detected for tabs: {}. Re-importing from Excel.", tabs);
            }
            ExcelSheetLoader loader = new ExcelSheetLoader();
            Map<String, ValueRange> data = new LinkedHashMap<>();
            for (String tab : tabs) {
                ValueRange vr = loader.loadValuesFromXlsxTab(xlsxPath, tab);
                data.put(tab, vr);
                maxCols.put(tab, detectMaxCols(vr));
            }
            // create tables and insert
            for (String tab : tabs) {
                String table = tablePrefix + tab;
                int cols = maxCols.get(tab);
                createTableIfNotExists(table, cols);
                insertAll(table, data.get(tab), cols);
            }
            if (!alreadyImported) {
                markImported();
            }
            logger.info("Excel import finished successfully.");
        } catch (Exception e) {
            logger.error("Excel import failed", e);
            throw new RuntimeException(e);
        }
    }

    private void ensureStatusTable() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS import_status ( status_key varchar(128) PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP )");
    }

    private boolean alreadyImported() {
        Integer c = jdbc.query("SELECT COUNT(*) FROM import_status WHERE status_key=?", ps -> ps.setString(1, "excel_merp_tables_imported"), rs -> {
            rs.next();
            return rs.getInt(1);
        });
        return c != null && c > 0;
    }

    private void markImported() {
        jdbc.update("INSERT INTO import_status(status_key) VALUES (?)", "excel_merp_tables_imported");
    }

    private int detectMaxCols(ValueRange vr) {
        int max = 0;
        List<List<Object>> rows = vr.getValues();
        if (rows == null) return 0;
        for (List<Object> row : rows) {
            if (row == null) continue;
            max = Math.max(max, row.size());
        }
        // first column is row_key, so number of value columns is max-1 (can be zero)
        return Math.max(0, max - 1);
    }

    private void createTableIfNotExists(String table, int cols) {
        StringBuilder sb = new StringBuilder();
        sb.append("CREATE TABLE IF NOT EXISTS ").append(table).append(" (")
          .append("row_key INT NOT NULL,");
        for (int i = 1; i <= cols; i++) {
            sb.append("col").append(i).append(" TEXT");
            if (i < cols) sb.append(",");
        }
        if (cols > 0) sb.append(",");
        sb.append("PRIMARY KEY (row_key))");
        jdbc.execute(sb.toString());
    }

    private void insertAll(String table, ValueRange vr, int cols) {
        List<List<Object>> rows = vr.getValues();
        if (rows == null || rows.isEmpty()) return;
        // assume first row is header, start at index 1
        for (int r = 1; r < rows.size(); r++) {
            List<Object> row = rows.get(r);
            if (row == null || row.isEmpty()) continue;
            Integer rowKey = parseRowKey(row.get(0));
            if (rowKey == null) continue;
            StringBuilder sql = new StringBuilder();
            sql.append("MERGE INTO ").append(table).append(" (row_key");
            for (int i = 1; i <= cols; i++) sql.append(", col").append(i);
            sql.append(") KEY(row_key) VALUES (?");
            for (int i = 1; i <= cols; i++) sql.append(", ?");
            sql.append(")");
            Object[] params = new Object[1 + cols];
            params[0] = rowKey;
            for (int i = 1; i <= cols; i++) {
                Object cell = (row.size() > i) ? row.get(i) : "";
                params[i] = (cell == null) ? "" : String.valueOf(cell);
            }
            jdbc.update(sql.toString(), params);
        }
    }

    private Integer parseRowKey(Object keyObj) {
        if (keyObj == null) return null;
        if (keyObj instanceof Number) return ((Number) keyObj).intValue();
        String s = String.valueOf(keyObj).trim();
        if (s.isEmpty()) return null;
        try {
            if (s.matches("^-?\\d+$")) return Integer.parseInt(s);
            if (s.matches("^-?\\d+\\.0+$")) return (int) Double.parseDouble(s);
        } catch (NumberFormatException ignore) {}
        return null;
    }

    private List<String> findMissingTabs(List<String> allTabs) {
        List<String> missing = new ArrayList<>();
        for (String tab : allTabs) {
            String table = tablePrefix + tab;
            if (tableNeedsImport(table)) {
                missing.add(tab);
            }
        }
        return missing;
    }

    private boolean tableNeedsImport(String table) {
        if (!tableExists(table)) {
            return true;
        }
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
            return count == null || count == 0;
        } catch (Exception e) {
            logger.warn("Unable to count rows for table '{}', re-import will be attempted. Cause: {}", table, e.getMessage());
            return true;
        }
    }

    private boolean tableExists(String table) {
        String schema = currentSchema();
        try {
            Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE UPPER(TABLE_SCHEMA)=? AND UPPER(TABLE_NAME)=?",
                    new Object[]{schema, table.toUpperCase()},
                    Integer.class
            );
            return count != null && count > 0;
        } catch (Exception e) {
            logger.warn("Unable to verify existence of table '{}', assuming missing. Cause: {}", table, e.getMessage());
            return false;
        }
    }

    private String currentSchema() {
        try {
            String schema = jdbc.queryForObject("SELECT SCHEMA()", String.class);
            if (schema == null || schema.isBlank()) {
                return "PUBLIC";
            }
            return schema.toUpperCase();
        } catch (Exception e) {
            logger.warn("Failed to determine current schema, defaulting to PUBLIC. Cause: {}", e.getMessage());
            return "PUBLIC";
        }
    }
}
