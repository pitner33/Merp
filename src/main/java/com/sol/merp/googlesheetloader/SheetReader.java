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

    @Autowired
    MapsFromTabs mapsFromTabs;

    @PostConstruct
    public void read() throws IOException, GeneralSecurityException {
        sheetsService = SheetsServiceUtil.getSheetsService();

        mapsFromTabs.setMapSlashing(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Slashing"), 1));
        mapsFromTabs.setMapBlunt(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Blunt"), 1));
        mapsFromTabs.setMapTwoHanded(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Twohanded"), 1));
        mapsFromTabs.setMapRanged(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Ranged"), 1));
        mapsFromTabs.setMapClawsAndFangs(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "ClawsAndFangs"), 1));
        mapsFromTabs.setMapGrabOrBalance(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "GrabOrBalance"), 1));
        mapsFromTabs.setMapMagicProjectile(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "MagicProjectile"), 1));
        mapsFromTabs.setMapMagicBall(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "MagicBall"), 1));
        mapsFromTabs.setMapBaseMagic(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "BaseMagic"), 1));
        mapsFromTabs.setMapBaseMagicMD(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "BaseMagicMD"), 3));
        mapsFromTabs.setMapCriticalSlashing(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Slashing"), 1));
        mapsFromTabs.setMapCriticalBlunt(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Blunt"), 1));
        mapsFromTabs.setMapCriticalPiercing(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Piercing"), 1));
        mapsFromTabs.setMapCriticalHeat(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Heat"), 1));
        mapsFromTabs.setMapCriticalCold(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Cold"), 1));
        mapsFromTabs.setMapCriticalElectricity(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Electricity"), 1));
        mapsFromTabs.setMapCriticalBalance(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Balance"), 1));
        mapsFromTabs.setMapCriticalCrushing(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Crushing"), 1));
        mapsFromTabs.setMapCriticalGrab(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Grab"), 1));
        mapsFromTabs.setMapCriticalBigCreaturePhisical(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_BigCreaturePhisical"), 1));
        mapsFromTabs.setMapCriticalBigCreatureMagic(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_BigCreatureMagic"), 1));
        mapsFromTabs.setMapFail(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Fail"), 1));
        mapsFromTabs.setMapMM(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "MM"), 1));
        mapsFromTabs.setMapOtherManeuver(sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "OtherManeuver"), 1));
    }

    ValueRange loadValuesFromGivenTabOfSheet(String sheetId, String tabName) {
        try {
            logger.debug("loading Google sheet '{}', tab '{}'", sheetId, tabName);
            ValueRange spreadsheet = sheetsService.spreadsheets()
                    .values()
                    .get(sheetId, tabName)
                    .execute();

            logger.debug("loaded tab '{}' from GoogleSheet successfully", tabName);
            return spreadsheet;

        } catch (IOException e) {
            throw new RuntimeException("Failed to load GoogleSheet tab '" + tabName + "'", e);
        }
    }


}


