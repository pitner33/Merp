package com.sol.merp.attributes;

public enum CritType {
    slashing("Slashing"),
    blunt("Blunt"),
    piercing("Piercing"),
    heat("Heat"),
    cold("Cold"),
    electricity("Electricity"),
    balance("Balance"),
    crushing("Crushing"),
    grab("Grab"),
    bigCreaturePhisical("Big Creature Physical"),
    bigCreatureMagic("Big Creature Magic"),
    none("None");

    private final String displayName;

    CritType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
