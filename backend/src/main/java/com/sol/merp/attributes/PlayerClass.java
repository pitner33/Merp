package com.sol.merp.attributes;

public enum PlayerClass {
    warrior("Warrior"),
    mage("Mage"),
    priest("Priest"),
    thief("Thief"),
    ranger("Ranger"),
    bard("Bard"),
    archer("Archer");

    private final String displayName;

    PlayerClass(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

}
