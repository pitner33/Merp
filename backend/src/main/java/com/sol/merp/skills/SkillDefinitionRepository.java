package com.sol.merp.skills;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillDefinitionRepository extends JpaRepository<SkillDefinition, Long> {
    Optional<SkillDefinition> findByNameIgnoreCase(String name);
}
