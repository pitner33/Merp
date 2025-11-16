package com.sol.merp.googlesheetloader;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import com.sol.merp.storage.DbSheetLoader;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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

    @Autowired
    JdbcTemplate jdbcTemplate;

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

        Map<String, Map<Integer, List<String>>> charTables = loadCharTables();
        mapsFromTabs.setMapCharTables(charTables);
    }

    private Map<String, Map<Integer, List<String>>> loadCharTables() {
        Map<String, Map<Integer, List<String>>> result = new LinkedHashMap<>();
        List<String> tables = findCharTableNames();
        for (String tableName : tables) {
            Map<Integer, List<String>> data = dbSheetLoader.loadTable(tableName);
            String logicalName = tableName.substring(Math.min(tablePrefix.length(), tableName.length()));
            result.put(logicalName, data);
        }
        return result;
    }

    private List<String> findCharTableNames() {
        String schema = currentSchema();
        String prefixUpper = tablePrefix.toUpperCase(Locale.ROOT);
        String pattern = prefixUpper + "CHAR\\_%";
        return jdbcTemplate.query(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE UPPER(TABLE_SCHEMA)=? AND UPPER(TABLE_NAME) LIKE ? ORDER BY TABLE_NAME",
                new Object[]{schema, pattern},
                (rs, i) -> rs.getString(1)
        );
    }

    private String currentSchema() {
        try {
            String schema = jdbcTemplate.queryForObject("SELECT SCHEMA()", String.class);
            if (schema == null || schema.isBlank()) {
                return "PUBLIC";
            }
            return schema.toUpperCase(Locale.ROOT);
        } catch (Exception e) {
            logger.warn("Failed to determine current schema, defaulting to PUBLIC. Cause: {}", e.getMessage());
            return "PUBLIC";
        }
    }


}


