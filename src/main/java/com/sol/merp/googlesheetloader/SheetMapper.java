package com.sol.merp.googlesheetloader;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.google.api.services.sheets.v4.model.ValueRange;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class SheetMapper {
    private Logger logger = LoggerFactory.getLogger(this.getClass());

    public Map<Integer, List<String>> processDataFromGivenTabOfSheet(ValueRange valuesLoadedFromGivenTabOfSheet) {
        //TODO try-catch where needed

        List<List<Object>> values = valuesLoadedFromGivenTabOfSheet.getValues();

        int headerSize = 1;
        List<List<Object>> valuesWithoutHeader = values.subList(headerSize, values.size());

        logger.info("values: " + values.toString());

        Map<Integer, List<String>> finalResults = valuesWithoutHeader.stream()
                    .collect(Collectors
                            .toMap(row -> Integer.parseInt(row.get(headerSize - 1).toString()),
                                    row -> row.subList(headerSize, row.size()).stream()
                                            .map(x -> String.valueOf(x)).collect(Collectors.toList())));

            logger.info("processed data in Map<Integer, List<String>: " + finalResults.toString());
        return finalResults;
    }
}

