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
        String schema = jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
        List<String> cols = jdbcTemplate.query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME LIKE 'col%' ORDER BY ORDINAL_POSITION",
                new Object[]{schema, tableName},
                (rs, i) -> rs.getString(1)
        );
        if (cols.isEmpty()) {
            return Collections.emptyMap();
        }
        StringBuilder sql = new StringBuilder("SELECT row_key");
        for (String c : cols) sql.append(", `").append(c).append("`");
        sql.append(" FROM `").append(tableName).append("` ORDER BY row_key");

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
