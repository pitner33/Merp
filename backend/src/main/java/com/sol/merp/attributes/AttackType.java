package com.sol.merp.attributes;

public enum AttackType {
    slashing("Slashing"),
    blunt("Blunt"),
    twoHanded("Two-handed"),
    ranged("Ranged"),
    clawsAndFangs("Claws and Fangs"),
    grabOrBalance("Grab or Balance"),
    baseMagic("Base Magic"),
    magicBall("Magic Ball"),
    magicProjectile("Magic Projectile");

    private final String displayName;

    AttackType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
