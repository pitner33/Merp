package com.sol.merp.googlesheetloader;

import com.google.api.services.sheets.v4.model.ValueRange;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class SheetMapper {
    private Logger logger = LoggerFactory.getLogger(this.getClass());

    public Map<Integer, List<String>> processDataFromGivenTabOfSheet(ValueRange valuesLoadedFromGivenTabOfSheet, int headerSize) {
        //TODO try-catch where needed

        List<List<Object>> values = valuesLoadedFromGivenTabOfSheet.getValues();
        logger.info("values: " + values.toString());

        List<List<Object>> valuesWithoutHeader = values.subList(headerSize, values.size());

        Map<Integer, List<String>> finalResults = valuesWithoutHeader.stream()
                .collect(Collectors
                        .toMap(row -> Integer.parseInt(row.get(0).toString()),
                                row -> row.subList(1, row.size()).stream()
                                        .map(x -> String.valueOf(x)).collect(Collectors.toList())));
        logger.info("processed data in Map<Integer, List<String>: " + finalResults.toString());
        return finalResults;
    }
}

