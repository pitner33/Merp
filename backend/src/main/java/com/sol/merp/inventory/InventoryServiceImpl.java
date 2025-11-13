package com.sol.merp.inventory;

import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.weapons.Weapon;
import com.sol.merp.weapons.WeaponRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class InventoryServiceImpl implements InventoryService {

    private static final String DEFAULT_DO_NOTHING = "Do Nothing";
    private static final String DEFAULT_PREPARE_MAGIC = "Prepare Magic";

    @Autowired
    private PlayerInventoryItemRepository inventoryRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private WeaponRepository weaponRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public List<PlayerInventoryItem> getInventoryForPlayer(Long playerId) {
        return inventoryRepository.findByPlayer_Id(playerId);
    }

    @Override
    @Transactional
    public List<PlayerInventoryItem> addWeaponsToPlayer(Long playerId, List<Long> weaponIds) {
        if (weaponIds == null || weaponIds.isEmpty()) {
            return inventoryRepository.findByPlayer_Id(playerId);
        }
        Player player = playerRepository.findById(playerId).orElseThrow(() -> new IllegalArgumentException("Player not found"));
        List<PlayerInventoryItem> added = new ArrayList<>();
        for (Long weaponId : weaponIds) {
            if (weaponId == null || inventoryRepository.existsByPlayer_IdAndWeapon_Id(playerId, weaponId)) {
                continue;
            }
            Weapon weapon = weaponRepository.findById(weaponId).orElseThrow(() -> new IllegalArgumentException("Weapon not found"));
            PlayerInventoryItem item = new PlayerInventoryItem(player, weapon, isDefaultWeapon(weapon));
            PlayerInventoryItem saved = inventoryRepository.save(item);
            added.add(saved);
        }
        entityManager.flush();
        return inventoryRepository.findByPlayer_Id(playerId);
    }

    @Override
    @Transactional
    public void removeWeaponFromPlayer(Long playerId, Long weaponId) {
        PlayerInventoryItem item = inventoryRepository.findByPlayer_IdAndWeapon_Id(playerId, weaponId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found"));
        if (item.isDefaultWeapon()) {
            throw new IllegalStateException("Default weapons cannot be removed");
        }
        inventoryRepository.delete(item);
        entityManager.flush();
    }

    @Override
    @Transactional
    public void ensureDefaultWeaponsForPlayer(Long playerId) {
        Player player = playerRepository.findById(playerId).orElse(null);
        if (player == null) {
            return;
        }
        ensureWeapon(player, DEFAULT_DO_NOTHING, true);
        ensureWeapon(player, DEFAULT_PREPARE_MAGIC, true);
        entityManager.flush();
    }

    @Override
    @Transactional
    public void ensureDefaultWeaponsForAllPlayers() {
        List<Player> players = playerRepository.findAll();
        for (Player player : players) {
            ensureWeapon(player, DEFAULT_DO_NOTHING, true);
            ensureWeapon(player, DEFAULT_PREPARE_MAGIC, true);
        }
        entityManager.flush();
    }

    private void ensureWeapon(Player player, String weaponName, boolean defaultWeapon) {
        if (player == null) {
            return;
        }
        Optional<Weapon> weaponOpt = weaponRepository.findByName(weaponName);
        if (weaponOpt.isEmpty()) {
            return;
        }
        Weapon weapon = weaponOpt.get();
        if (inventoryRepository.existsByPlayer_IdAndWeapon_Id(player.getId(), weapon.getId())) {
            return;
        }
        PlayerInventoryItem item = new PlayerInventoryItem(player, weapon, defaultWeapon);
        inventoryRepository.save(item);
    }

    private boolean isDefaultWeapon(Weapon weapon) {
        if (weapon == null || weapon.getName() == null) {
            return false;
        }
        String name = weapon.getName();
        return DEFAULT_DO_NOTHING.equalsIgnoreCase(name) || DEFAULT_PREPARE_MAGIC.equalsIgnoreCase(name);
    }
}
