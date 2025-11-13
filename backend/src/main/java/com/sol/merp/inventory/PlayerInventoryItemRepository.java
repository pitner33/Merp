package com.sol.merp.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerInventoryItemRepository extends JpaRepository<PlayerInventoryItem, Long> {
    List<PlayerInventoryItem> findByPlayer_Id(Long playerId);

    Optional<PlayerInventoryItem> findByPlayer_IdAndWeapon_Id(Long playerId, Long weaponId);

    boolean existsByPlayer_IdAndWeapon_Id(Long playerId, Long weaponId);

    void deleteByPlayer_IdAndWeapon_Id(Long playerId, Long weaponId);
}
