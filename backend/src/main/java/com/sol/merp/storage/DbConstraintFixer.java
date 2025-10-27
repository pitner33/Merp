package com.sol.merp.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.boot.context.event.ApplicationReadyEvent;

import java.util.List;

/**
 * Drops legacy CHECK constraints that incorrectly couple IS_PLAYING and IS_ACTIVE on the PLAYER table.
 * This aligns the DB with the current domain rule: isPlaying is independent.
 */
@Component
public class DbConstraintFixer {
    private static final Logger log = LoggerFactory.getLogger(DbConstraintFixer.class);

    @Autowired
    JdbcTemplate jdbc;

    @EventListener(ApplicationReadyEvent.class)
    public void dropLegacyChecks() {
        try {
            // Only run if the PLAYER table exists
            Integer playerCount = jdbc.query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PLAYER'", (rs, rn) -> rs.getInt(1))
                    .stream().findFirst().orElse(0);
            if (playerCount == 0) return;

            // Find CHECK constraints on PLAYER
            List<String> constraintNames = jdbc.query(
                    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.CONSTRAINTS WHERE TABLE_NAME='PLAYER' AND CONSTRAINT_TYPE='CHECK'",
                    (rs, rn) -> rs.getString(1)
            );

            for (String name : constraintNames) {
                try {
                    String expr = jdbc.query(
                            "SELECT CHECK_EXPRESSION FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_NAME = ?",
                            ps -> ps.setString(1, name),
                            rs -> rs.next() ? rs.getString(1) : null
                    );
                    if (expr == null) continue;
                    String e = expr.toUpperCase();
                    // Heuristic: drop any check that mentions both IS_PLAYING and IS_ACTIVE
                    if (e.contains("IS_PLAYING") && e.contains("IS_ACTIVE")) {
                        String sql = "ALTER TABLE PLAYER DROP CONSTRAINT " + name;
                        jdbc.execute(sql);
                        log.warn("Dropped legacy CHECK constraint {} on PLAYER (expr={})", name, expr);
                    }
                } catch (Exception inner) {
                    log.debug("Skip constraint {} due to error: {}", name, inner.toString());
                }
            }
        } catch (Exception ex) {
            log.debug("DbConstraintFixer failed (non-fatal): {}", ex.toString());
        }
    }
}
