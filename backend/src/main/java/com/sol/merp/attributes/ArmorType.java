package com.sol.merp.attributes;

public enum ArmorType {

    plate("Plate"),
    chainmail("Chainmail"),
    heavyLeather("Heavy Leather"),
    leather("Leather"),
    none("None");

    private final String displayName;

    ArmorType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
