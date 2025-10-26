package com.sol.merp.attributes;

public enum PlayerActivity {
    _1PerformMagic("Perform Magic"),
    _2RangedAttack("Ranged Attack"),
    _3PhisicalAttackOrMovement("Attack or Movement"),
    _4PrepareMagic("Prepare Magic"),
    _5DoNothing("Do Nothing");

    private final String displayName;

    PlayerActivity(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
