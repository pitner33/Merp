package com.sol.merp.storage;

import com.sol.merp.googlesheetloader.MapsFromTabs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Profile;

import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;

@Component
@Profile("legacy-seed")
public class DataSeeder {

    private final Logger logger = LoggerFactory.getLogger(getClass());

    @Autowired
    private MapsFromTabs mapsFromTabs;

    @Autowired
    private SheetTableCellRepository repo;

    @PostConstruct
    @Transactional
    public void seed() {
        logger.info("Seeding DB from MapsFromTabs into sheet_table_cell...");
        repo.deleteAll();
        saveTable("Slashing", mapsFromTabs.getMapSlashing());
        saveTable("Blunt", mapsFromTabs.getMapBlunt());
        saveTable("Twohanded", mapsFromTabs.getMapTwoHanded());
        saveTable("Ranged", mapsFromTabs.getMapRanged());
        saveTable("ClawsAndFangs", mapsFromTabs.getMapClawsAndFangs());
        saveTable("GrabOrBalance", mapsFromTabs.getMapGrabOrBalance());
        saveTable("MagicProjectile", mapsFromTabs.getMapMagicProjectile());
        saveTable("MagicBall", mapsFromTabs.getMapMagicBall());
        saveTable("BaseMagic", mapsFromTabs.getMapBaseMagic());
        saveTable("BaseMagicMD", mapsFromTabs.getMapBaseMagicMD());
        saveTable("Critical_Slashing", mapsFromTabs.getMapCriticalSlashing());
        saveTable("Critical_Blunt", mapsFromTabs.getMapCriticalBlunt());
        saveTable("Critical_Piercing", mapsFromTabs.getMapCriticalPiercing());
        saveTable("Critical_Heat", mapsFromTabs.getMapCriticalHeat());
        saveTable("Critical_Cold", mapsFromTabs.getMapCriticalCold());
        saveTable("Critical_Electricity", mapsFromTabs.getMapCriticalElectricity());
        saveTable("Critical_Balance", mapsFromTabs.getMapCriticalBalance());
        saveTable("Critical_Crushing", mapsFromTabs.getMapCriticalCrushing());
        saveTable("Critical_Grab", mapsFromTabs.getMapCriticalGrab());
        saveTable("Critical_BigCreaturePhisical", mapsFromTabs.getMapCriticalBigCreaturePhisical());
        saveTable("Critical_BigCreatureMagic", mapsFromTabs.getMapCriticalBigCreatureMagic());
        saveTable("Fail", mapsFromTabs.getMapFail());
        saveTable("MM", mapsFromTabs.getMapMM());
        saveTable("OtherManeuver", mapsFromTabs.getMapOtherManeuver());
        logger.info("Seeding completed");
    }

    private void saveTable(String tableName, Map<Integer, List<String>> map) {
        if (map == null) {
            logger.warn("Map '{}' is null, skipping", tableName);
            return;
        }
        map.forEach((rowKey, cols) -> {
            for (int i = 0; i < cols.size(); i++) {
                SheetTableCell cell = new SheetTableCell();
                cell.setTableName(tableName);
                cell.setRowKey(rowKey);
                cell.setColOrder(i + 1);
                cell.setValue(cols.get(i));
                repo.save(cell);
            }
        });
    }
}
