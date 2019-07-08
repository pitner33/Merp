package com.sol.merp.googlesheetloader;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ValueRange;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.security.GeneralSecurityException;

@Component
public class SheetReader {
    //TODO try-catch where needed

    private Logger logger = LoggerFactory.getLogger(this.getClass());

    private static Sheets sheetsService;

    @Value("${sheet.sheetId}")
    private String sheetId;

    @Autowired
    SheetMapper sheetMapper;

    @PostConstruct
    public void read() throws IOException, GeneralSecurityException {
        sheetsService = SheetsServiceUtil.getSheetsService();

        ValueRange slashing = loadValuesFromGivenTabOfSheet(sheetId, "Slashing");
        logger.info("ValueRange from proba2: " + slashing);

        sheetMapper.processDataFromGivenTabOfSheet(slashing);

    }

    ValueRange loadValuesFromGivenTabOfSheet(String sheetId, String tabName) {
        try {
            logger.debug("loading Google sheet '{}', tab '{}'", sheetId, tabName);
            ValueRange spreadsheet = sheetsService.spreadsheets()
                    .values()
                    .get(sheetId, tabName)
                    .execute();

            logger.debug("loaded sheet '{}' successfully", tabName);
            return spreadsheet;

        } catch (IOException e) {
            throw new RuntimeException("Failed to load sheet with ID '" + sheetId + "' and tab '" + tabName + "'", e);
        }
    }
}


