package com.sol.merp.googlesheetloader;

import com.google.api.services.sheets.v4.model.ValueRange;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Component
public class SheetMapper {
    private Logger logger = LoggerFactory.getLogger(this.getClass());

    public Map<Integer, List<String>> processDataFromGivenTabOfSheet(ValueRange valuesLoadedFromGivenTabOfSheet, int headerSize) {
        //TODO try-catch where needed

        List<List<Object>> values = valuesLoadedFromGivenTabOfSheet.getValues();
        logger.info("values: " + values.toString());

        List<List<Object>> valuesWithoutHeader = values.subList(headerSize, values.size());

        Map<Integer, List<String>> finalResults = new LinkedHashMap<>();
        for (List<Object> row : valuesWithoutHeader) {
            if (row == null || row.isEmpty()) continue;
            Object keyObj = row.get(0);
            if (keyObj == null) continue;
            Integer key = parseRowKey(keyObj);
            if (key == null) continue; // skip non-numeric/empty key rows
            java.util.ArrayList<String> cols = new java.util.ArrayList<>();
            for (int i = 1; i < row.size(); i++) {
                Object cell = row.get(i);
                cols.add(cell == null ? "" : String.valueOf(cell));
            }
            finalResults.put(key, cols);
        }
        logger.info("processed data in Map<Integer, List<String>: " + finalResults.toString());
        return finalResults;
    }

    private Integer parseRowKey(Object keyObj) {
        if (keyObj instanceof Number) {
            return ((Number) keyObj).intValue();
        }
        String s = String.valueOf(keyObj).trim();
        if (s.isEmpty()) return null;
        // Handle values like "1.0" from Excel text
        if (s.matches("^-?\\d+$")) {
            try { return Integer.parseInt(s); } catch (NumberFormatException e) { return null; }
        }
        if (s.matches("^-?\\d+\\.0+$")) {
            try { return (int) Double.parseDouble(s); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }
}

