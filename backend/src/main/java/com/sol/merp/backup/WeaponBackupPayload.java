package com.sol.merp.backup;

import java.util.List;

import com.sol.merp.weapons.Weapon;

public class WeaponBackupPayload {

    private BackupDomain.BackupMetadata metadata;
    private List<Weapon> weapons;

    public WeaponBackupPayload() {
    }

    public BackupDomain.BackupMetadata getMetadata() {
        return metadata;
    }

    public void setMetadata(BackupDomain.BackupMetadata metadata) {
        this.metadata = metadata;
    }

    public List<Weapon> getWeapons() {
        return weapons;
    }

    public void setWeapons(List<Weapon> weapons) {
        this.weapons = weapons;
    }
}
