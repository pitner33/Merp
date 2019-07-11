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
import java.util.List;
import java.util.Map;

@Component
public class SheetReader {
    //TODO try-catch where needed
    public Map<Integer, List<String>> mapSlashing;
    public Map<Integer, List<String>> mapBlunt;
    public Map<Integer, List<String>> mapTwoHanded;
    public Map<Integer, List<String>> mapRanged;
    public Map<Integer, List<String>> mapClawsAndFangs;
    public Map<Integer, List<String>> mapGrabOrBalance;
    public Map<Integer, List<String>> mapMagicProjectile;
    public Map<Integer, List<String>> mapMagicBall;
    public Map<Integer, List<String>> mapBaseMagic;
    public Map<Integer, List<String>> mapBaseMagicMD;
    public Map<Integer, List<String>> mapCriticalSlashing;
    public Map<Integer, List<String>> mapCriticalBlunt;
    public Map<Integer, List<String>> mapCriticalPiercing;
    public Map<Integer, List<String>> mapCriticalHeat;
    public Map<Integer, List<String>> mapCriticalCold;
    public Map<Integer, List<String>> mapCriticalElectricity;
    public Map<Integer, List<String>> mapCriticalBalance;
    public Map<Integer, List<String>> mapCriticalCrushing;
    public Map<Integer, List<String>> mapCriticalGrab;
    public Map<Integer, List<String>> mapCriticalBigCreaturePhisical;
    public Map<Integer, List<String>> mapCriticalBigCreatureMagic;
    public Map<Integer, List<String>> mapFail;
    public Map<Integer, List<String>> mapMM;
    public Map<Integer, List<String>> mapOtherManeuver;

    private Logger logger = LoggerFactory.getLogger(this.getClass());

    private static Sheets sheetsService;

    @Value("${sheet.sheetId}")
    private String sheetId;

    @Autowired
    SheetMapper sheetMapper;

    @PostConstruct
    public void read() throws IOException, GeneralSecurityException {
        sheetsService = SheetsServiceUtil.getSheetsService();

        mapSlashing = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Slashing"), 1);
        mapBlunt = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Blunt"), 1);
        mapTwoHanded = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Twohanded"), 1);
        mapRanged = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Ranged"), 1);
        mapClawsAndFangs = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "ClawsAndFangs"), 1);
        mapGrabOrBalance = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "GrabOrBalance"), 1);
        mapMagicProjectile = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "MagicProjectile"), 1);
        mapMagicBall = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "MagicBall"), 1);
        mapBaseMagic = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "BaseMagic"), 1);
        mapBaseMagicMD = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "BaseMagicMD"), 3);
        mapCriticalSlashing = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Slashing"), 1);
        mapCriticalBlunt = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Blunt"), 1);
        mapCriticalPiercing = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Piercing"), 1);
        mapCriticalHeat = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Heat"), 1);
        mapCriticalCold = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Cold"), 1);
        mapCriticalElectricity = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Electricity"), 1);
        mapCriticalBalance = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Balance"), 1);
        mapCriticalCrushing = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Crushing"), 1);
        mapCriticalGrab = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_Grab"), 1);
        mapCriticalBigCreaturePhisical = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_BigCreaturePhisical"), 1);
        mapCriticalBigCreatureMagic = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Critical_BigCreatureMagic"), 1);
        mapFail = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "Fail"), 1);
        mapMM = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "MM"), 1);
        mapOtherManeuver = sheetMapper.processDataFromGivenTabOfSheet(loadValuesFromGivenTabOfSheet(sheetId, "OtherManeuver"), 1);



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


