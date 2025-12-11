package com.sol.merp.backup;

import java.util.List;

public interface BackupService {

    List<BackupDomain.BackupMetadata> listBackups(BackupDomain.BackupType type);

    BackupDomain.BackupMetadata createWeaponBackup(String label);

    BackupDomain.BackupMetadata createPlayerBackup(String label, String weaponBackupId);

    default BackupDomain.BackupMetadata createPlayerBackup(String label) {
        return createPlayerBackup(label, null);
    }

    void restoreWeaponBackup(String backupId, BackupDomain.RestoreMode mode);

    void restorePlayerBackup(String backupId, BackupDomain.RestoreMode mode, boolean restorePairedWeapon);

    default void restorePlayerBackup(String backupId, BackupDomain.RestoreMode mode) {
        restorePlayerBackup(backupId, mode, false);
    }

    WeaponBackupPayload loadWeaponBackupPayload(String backupId);

    PlayerBackupPayload loadPlayerBackupPayload(String backupId);

    BackupDomain.BackupMetadata importWeaponBackup(WeaponBackupPayload payload);

    BackupDomain.BackupMetadata importPlayerBackup(PlayerBackupPayload payload);

    void deleteBackup(BackupDomain.BackupType type, String backupId);

    void deleteAllPlayerData();

    void deleteAllWeaponData();
}
