package com.sol.merp.skills;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sol.merp.characters.Player;

public interface PlayerSkillRepository extends JpaRepository<PlayerSkill, Long> {
    boolean existsByPlayerAndSkillDefinition(Player player, SkillDefinition skillDefinition);

    java.util.List<PlayerSkill> findByPlayer_Id(Long playerId);
}
