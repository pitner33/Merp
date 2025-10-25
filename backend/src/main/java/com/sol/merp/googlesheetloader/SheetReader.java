package com.sol.merp.googlesheetloader;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import com.sol.merp.storage.DbSheetLoader;

import jakarta.annotation.PostConstruct;
import java.io.IOException;

@Component
public class SheetReader {
    //TODO try-catch where needed


    private Logger logger = LoggerFactory.getLogger(this.getClass());

    @Value("${sheet.tablePrefix}")
    private String tablePrefix;

    @Autowired
    DbSheetLoader dbSheetLoader;

    @Autowired
    MapsFromTabs mapsFromTabs;

    @PostConstruct
    public void read() throws IOException {
        logger.info("Loading data from DB tables with prefix: {}", tablePrefix);
        mapsFromTabs.setMapSlashing(dbSheetLoader.loadTable(tablePrefix + "Slashing"));
        mapsFromTabs.setMapBlunt(dbSheetLoader.loadTable(tablePrefix + "Blunt"));
        mapsFromTabs.setMapTwoHanded(dbSheetLoader.loadTable(tablePrefix + "Twohanded"));
        mapsFromTabs.setMapRanged(dbSheetLoader.loadTable(tablePrefix + "Ranged"));
        mapsFromTabs.setMapClawsAndFangs(dbSheetLoader.loadTable(tablePrefix + "ClawsAndFangs"));
        mapsFromTabs.setMapGrabOrBalance(dbSheetLoader.loadTable(tablePrefix + "GrabOrBalance"));
        mapsFromTabs.setMapMagicProjectile(dbSheetLoader.loadTable(tablePrefix + "MagicProjectile"));
        mapsFromTabs.setMapMagicBall(dbSheetLoader.loadTable(tablePrefix + "MagicBall"));
        mapsFromTabs.setMapBaseMagic(dbSheetLoader.loadTable(tablePrefix + "BaseMagic"));
        mapsFromTabs.setMapBaseMagicMD(dbSheetLoader.loadTable(tablePrefix + "BaseMagicMD"));
        mapsFromTabs.setMapCriticalSlashing(dbSheetLoader.loadTable(tablePrefix + "Critical_Slashing"));
        mapsFromTabs.setMapCriticalBlunt(dbSheetLoader.loadTable(tablePrefix + "Critical_Blunt"));
        mapsFromTabs.setMapCriticalPiercing(dbSheetLoader.loadTable(tablePrefix + "Critical_Piercing"));
        mapsFromTabs.setMapCriticalHeat(dbSheetLoader.loadTable(tablePrefix + "Critical_Heat"));
        mapsFromTabs.setMapCriticalCold(dbSheetLoader.loadTable(tablePrefix + "Critical_Cold"));
        mapsFromTabs.setMapCriticalElectricity(dbSheetLoader.loadTable(tablePrefix + "Critical_Electricity"));
        mapsFromTabs.setMapCriticalBalance(dbSheetLoader.loadTable(tablePrefix + "Critical_Balance"));
        mapsFromTabs.setMapCriticalCrushing(dbSheetLoader.loadTable(tablePrefix + "Critical_Crushing"));
        mapsFromTabs.setMapCriticalGrab(dbSheetLoader.loadTable(tablePrefix + "Critical_Grab"));
        mapsFromTabs.setMapCriticalBigCreaturePhisical(dbSheetLoader.loadTable(tablePrefix + "Critical_BigCreaturePhisical"));
        mapsFromTabs.setMapCriticalBigCreatureMagic(dbSheetLoader.loadTable(tablePrefix + "Critical_BigCreatureMagic"));
        mapsFromTabs.setMapFail(dbSheetLoader.loadTable(tablePrefix + "Fail"));
        mapsFromTabs.setMapMM(dbSheetLoader.loadTable(tablePrefix + "MM"));
        mapsFromTabs.setMapOtherManeuver(dbSheetLoader.loadTable(tablePrefix + "OtherManeuver"));
    }


}


