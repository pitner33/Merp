package com.sol.merp.storage;

import com.google.api.services.sheets.v4.model.ValueRange;
import com.sol.merp.googlesheetloader.ExcelSheetLoader;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
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
            Map<String,Boolean> stringKeyModes = new LinkedHashMap<>();

            List<String> baseTabs = Arrays.asList(
                    "Slashing","Blunt","Twohanded","Ranged","ClawsAndFangs","GrabOrBalance",
                    "MagicProjectile","MagicBall","BaseMagic","BaseMagicMD",
                    "Critical_Slashing","Critical_Blunt","Critical_Piercing","Critical_Heat","Critical_Cold",
                    "Critical_Electricity","Critical_Balance","Critical_Crushing","Critical_Grab",
                    "Critical_BigCreaturePhisical","Critical_BigCreatureMagic",
                    "Fail","MM","OtherManeuver"
            );

            List<String> charTabs = discoverCharTabs();
            if (!charTabs.isEmpty()) {
                logger.info("Discovered CHAR_ tabs in workbook: {}", charTabs);
            }

            LinkedHashSet<String> allTabSet = new LinkedHashSet<>();
            allTabSet.addAll(baseTabs);
            allTabSet.addAll(charTabs);
            List<String> allTabs = new ArrayList<>(allTabSet);

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
                boolean stringKeyMode = shouldUseStringKey(vr);
                stringKeyModes.put(tab, stringKeyMode);
                maxCols.put(tab, detectMaxCols(vr, stringKeyMode));
            }
            // create tables and insert
            for (String tab : tabs) {
                String table = tablePrefix + tab;
                int cols = maxCols.get(tab);
                ensureTableStructure(table, cols);
                boolean stringKeyMode = stringKeyModes.getOrDefault(tab, Boolean.FALSE);
                insertAll(table, data.get(tab), cols, stringKeyMode);
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

    private List<String> discoverCharTabs() {
        List<String> tabs = new ArrayList<>();
        try (FileInputStream fis = new FileInputStream(xlsxPath);
             Workbook workbook = new XSSFWorkbook(fis)) {
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                String name = workbook.getSheetName(i);
                if (name != null && name.toUpperCase(Locale.ROOT).startsWith("CHAR_")) {
                    tabs.add(name);
                }
            }
            Collections.sort(tabs);
        } catch (IOException e) {
            logger.warn("Failed to inspect Excel workbook for CHAR_ tabs: {}", e.getMessage());
        }
        return tabs;
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

    private int detectMaxCols(ValueRange vr, boolean stringKeyMode) {
        int max = 0;
        int headerCols = 0;
        List<List<Object>> rows = vr.getValues();
        if (rows == null) return 0;
        if (!rows.isEmpty() && rows.get(0) != null) {
            headerCols = rows.get(0).stream()
                    .map(obj -> obj == null ? "" : String.valueOf(obj).trim())
                    .collect(java.util.stream.Collectors.collectingAndThen(
                            java.util.stream.Collectors.toList(), list -> {
                                int result = list.size();
                                while (result > 0 && list.get(result - 1).isEmpty()) {
                                    result--;
                                }
                                return result;
                            }));
        }
        for (List<Object> row : rows) {
            if (row == null) continue;
            int trimmed = row.stream()
                    .map(obj -> obj == null ? "" : String.valueOf(obj).trim())
                    .collect(java.util.stream.Collectors.collectingAndThen(
                            java.util.stream.Collectors.toList(), list -> {
                                int res = list.size();
                                while (res > 0 && list.get(res - 1).isEmpty()) {
                                    res--;
                                }
                                return res;
                            }));
            max = Math.max(max, trimmed);
        }
        int effectiveMax = Math.max(max, headerCols);
        if (stringKeyMode) {
            return effectiveMax;
        }
        // first column is row_key, so number of value columns is max-1 (can be zero)
        return Math.max(0, effectiveMax - 1);
    }

    private void ensureTableStructure(String table, int cols) {
        if (!tableExists(table)) {
            createTable(table, cols);
            return;
        }
        int existingCols = existingValueColumnCount(table);
        if (existingCols >= cols) {
            return;
        }
        for (int i = existingCols + 1; i <= cols; i++) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN col" + i + " TEXT");
        }
    }

    private void createTable(String table, int cols) {
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

    private int existingValueColumnCount(String table) {
        String schema = currentSchema();
        List<String> cols = jdbc.query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS " +
                        "WHERE UPPER(TABLE_SCHEMA)=UPPER(?) AND UPPER(TABLE_NAME)=UPPER(?) " +
                        "AND UPPER(COLUMN_NAME) LIKE 'COL%' ORDER BY ORDINAL_POSITION",
                new Object[]{schema, table},
                (rs, i) -> rs.getString(1)
        );
        return cols.size();
    }

    private void insertAll(String table, ValueRange vr, int cols, boolean stringKeyMode) {
        List<List<Object>> rows = vr.getValues();
        if (rows == null || rows.isEmpty()) return;
        // assume first row is header, start at index 1
        for (int r = 1; r < rows.size(); r++) {
            List<Object> row = rows.get(r);
            if (row == null || row.isEmpty()) continue;
            Integer rowKey;
            if (stringKeyMode) {
                rowKey = r;
            } else {
                rowKey = parseRowKey(row.get(0));
                if (rowKey == null) continue;
            }
            StringBuilder sql = new StringBuilder();
            sql.append("MERGE INTO ").append(table).append(" (row_key");
            for (int i = 1; i <= cols; i++) sql.append(", col").append(i);
            sql.append(") KEY(row_key) VALUES (?");
            for (int i = 1; i <= cols; i++) sql.append(", ?");
            sql.append(")");
            Object[] params = new Object[1 + cols];
            params[0] = rowKey;
            for (int i = 1; i <= cols; i++) {
                Object cell;
                if (stringKeyMode) {
                    int sourceIdx = i - 1;
                    cell = (row.size() > sourceIdx) ? row.get(sourceIdx) : "";
                } else {
                    cell = (row.size() > i) ? row.get(i) : "";
                }
                params[i] = (cell == null) ? "" : String.valueOf(cell);
            }
            jdbc.update(sql.toString(), params);
        }
    }

    private boolean shouldUseStringKey(ValueRange vr) {
        List<List<Object>> rows = vr.getValues();
        if (rows == null || rows.size() <= 1) return false;
        for (int r = 1; r < rows.size(); r++) {
            List<Object> row = rows.get(r);
            if (row == null || row.isEmpty()) continue;
            Object keyObj = row.get(0);
            if (keyObj == null) continue;
            Integer numericKey = parseRowKey(keyObj);
            return numericKey == null;
        }
        return false;
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
