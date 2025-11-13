package com.sol.merp.inventory;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.sol.merp.characters.Player;
import com.sol.merp.weapons.Weapon;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "player_inventory_items",
    uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "weapon_id"})
)
@Getter
@Setter
@NoArgsConstructor
public class PlayerInventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id")
    @JsonIgnoreProperties({"inventoryItems", "activePenaltyEffects"})
    private Player player;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "weapon_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Weapon weapon;

    private boolean defaultWeapon;

    public PlayerInventoryItem(Player player, Weapon weapon, boolean defaultWeapon) {
        this.player = player;
        this.weapon = weapon;
        this.defaultWeapon = defaultWeapon;
    }
}
