package com.sol.merp.storage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class DbSheetLoader {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public Map<Integer, List<String>> loadTable(String tableName) {
        String schema = jdbcTemplate.queryForObject("SELECT SCHEMA()", String.class);
        if (schema == null || schema.isBlank()) schema = "PUBLIC";

        // Case-insensitive discovery of COL* columns for the target table
        List<String> cols = jdbcTemplate.query(
                "SELECT COLUMN_NAME " +
                        "FROM INFORMATION_SCHEMA.COLUMNS " +
                        "WHERE UPPER(TABLE_SCHEMA)=UPPER(?) AND UPPER(TABLE_NAME)=UPPER(?) " +
                        "AND UPPER(COLUMN_NAME) LIKE 'COL%' " +
                        "ORDER BY ORDINAL_POSITION",
                new Object[]{schema, tableName},
                (rs, i) -> rs.getString(1).toUpperCase()
        );
        if (cols.isEmpty()) {
            return Collections.emptyMap();
        }
        // Build a case-insensitive SELECT by using unquoted identifiers (H2 uppercases them)
        StringBuilder sql = new StringBuilder("SELECT ROW_KEY");
        for (String c : cols) sql.append(", ").append(c);
        sql.append(" FROM ").append(tableName).append(" ORDER BY ROW_KEY");

        Map<Integer, List<String>> map = new LinkedHashMap<>();
        jdbcTemplate.query(sql.toString(), rs -> {
            int rowKey = rs.getInt(1);
            List<String> values = new ArrayList<>();
            for (int i = 0; i < cols.size(); i++) {
                String v = rs.getString(i + 2);
                values.add(v == null ? "" : v);
            }
            map.put(rowKey, values);
        });
        return map;
    }
}
