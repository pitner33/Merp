package com.sol.merp.inventory;

import java.util.List;

public interface InventoryService {

    List<PlayerInventoryItem> getInventoryForPlayer(Long playerId);

    List<PlayerInventoryItem> addWeaponsToPlayer(Long playerId, List<Long> weaponIds);

    void removeWeaponFromPlayer(Long playerId, Long weaponId);

    void ensureDefaultWeaponsForPlayer(Long playerId);

    void ensureDefaultWeaponsForAllPlayers();
}
