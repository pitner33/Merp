package com.sol.merp.backup;

import java.util.List;

import com.sol.merp.characters.Player;
import com.sol.merp.inventory.PlayerInventoryItem;
import com.sol.merp.skills.PlayerSkill;
import com.sol.merp.characters.PlayerLanguage;
import com.sol.merp.characters.PlayerSpellList;
import com.sol.merp.characters.PlayerAttributeTotal;
import com.sol.merp.characters.PlayerBonusAdjustment;
import com.sol.merp.modifiers.AttackModifier;
import com.sol.merp.modifiers.RangedMagicModifier;

public class PlayerBackupPayload {

    private BackupDomain.BackupMetadata metadata;
    private List<Player> players;
    private List<PlayerInventoryItem> inventoryItems;
    private List<PlayerSkill> playerSkills;
    private List<PlayerLanguage> languages;
    private List<PlayerSpellList> spellLists;
    private List<PlayerAttributeTotal> attributeTotals;
    private List<PlayerBonusAdjustment> bonusAdjustments;
    private List<AttackModifier> attackModifiers;
    private List<RangedMagicModifier> rangedMagicModifiers;

    public PlayerBackupPayload() {
    }

    public BackupDomain.BackupMetadata getMetadata() {
        return metadata;
    }

    public void setMetadata(BackupDomain.BackupMetadata metadata) {
        this.metadata = metadata;
    }

    public List<Player> getPlayers() {
        return players;
    }

    public void setPlayers(List<Player> players) {
        this.players = players;
    }

    public List<PlayerInventoryItem> getInventoryItems() {
        return inventoryItems;
    }

    public void setInventoryItems(List<PlayerInventoryItem> inventoryItems) {
        this.inventoryItems = inventoryItems;
    }

    public List<PlayerSkill> getPlayerSkills() {
        return playerSkills;
    }

    public void setPlayerSkills(List<PlayerSkill> playerSkills) {
        this.playerSkills = playerSkills;
    }

    public List<PlayerLanguage> getLanguages() {
        return languages;
    }

    public void setLanguages(List<PlayerLanguage> languages) {
        this.languages = languages;
    }

    public List<PlayerSpellList> getSpellLists() {
        return spellLists;
    }

    public void setSpellLists(List<PlayerSpellList> spellLists) {
        this.spellLists = spellLists;
    }

    public List<PlayerAttributeTotal> getAttributeTotals() {
        return attributeTotals;
    }

    public void setAttributeTotals(List<PlayerAttributeTotal> attributeTotals) {
        this.attributeTotals = attributeTotals;
    }

    public List<PlayerBonusAdjustment> getBonusAdjustments() {
        return bonusAdjustments;
    }

    public void setBonusAdjustments(List<PlayerBonusAdjustment> bonusAdjustments) {
        this.bonusAdjustments = bonusAdjustments;
    }

    public List<AttackModifier> getAttackModifiers() {
        return attackModifiers;
    }

    public void setAttackModifiers(List<AttackModifier> attackModifiers) {
        this.attackModifiers = attackModifiers;
    }

    public List<RangedMagicModifier> getRangedMagicModifiers() {
        return rangedMagicModifiers;
    }

    public void setRangedMagicModifiers(List<RangedMagicModifier> rangedMagicModifiers) {
        this.rangedMagicModifiers = rangedMagicModifiers;
    }
}
