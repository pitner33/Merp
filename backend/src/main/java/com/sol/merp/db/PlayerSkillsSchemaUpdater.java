package com.sol.merp.db;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PlayerSkillsSchemaUpdater implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public PlayerSkillsSchemaUpdater(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        // Hibernate ddl-auto=update does not reliably relax NOT NULL constraints.
        // We need skill_definition_id nullable for custom skills.
        tryExecute("alter table player_skills alter column skill_definition_id set null");

        // Custom skill columns (idempotent)
        tryExecute("alter table player_skills add column if not exists custom_name varchar(120)");
        tryExecute("alter table player_skills add column if not exists custom_attribute_key varchar(32)");
        tryExecute("alter table player_skills add column if not exists custom_slot_index int");

        // Ensure uniqueness for the 5 custom slots per player.
        // H2 allows multiple NULLs in a UNIQUE index, so normal skills (NULL custom_slot_index) are unaffected.
        tryExecute("create unique index if not exists ux_player_skills_player_custom_slot on player_skills(player_id, custom_slot_index)");
    }

    private void tryExecute(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception ignored) {
            // Intentionally ignore: schema may already be in desired shape or the dialect differs.
        }
    }
}
