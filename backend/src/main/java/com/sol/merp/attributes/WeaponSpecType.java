package com.sol.merp.attributes;

public enum WeaponSpecType {
    none ("None"),
    normal ("Normal"),
    magic ("Magic"),
    mithril ("Mithril"),
    holy ("Holy"),
    monsterKiller ("Monster Killer");

    private final String displayName;

    WeaponSpecType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
