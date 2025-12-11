package com.sol.merp.backup;

import java.time.Instant;

public class BackupDomain {

    public enum BackupType {
        PLAYER,
        WEAPON
    }

    public enum RestoreMode {
        FILL_EMPTY_OR_CREATE,
        OVERWRITE
    }

    public static class BackupMetadata {
        private String id;
        private BackupType type;
        private String label;
        private Instant createdAt;
        private String schemaVersion;
        private Long playerCount;
        private Long weaponCount;
        private String weaponBackupId; // for PLAYER backups, can link to a WEAPON backup
        private String fileName;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public BackupType getType() {
            return type;
        }

        public void setType(BackupType type) {
            this.type = type;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public Instant getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(Instant createdAt) {
            this.createdAt = createdAt;
        }

        public String getSchemaVersion() {
            return schemaVersion;
        }

        public void setSchemaVersion(String schemaVersion) {
            this.schemaVersion = schemaVersion;
        }

        public Long getPlayerCount() {
            return playerCount;
        }

        public void setPlayerCount(Long playerCount) {
            this.playerCount = playerCount;
        }

        public Long getWeaponCount() {
            return weaponCount;
        }

        public void setWeaponCount(Long weaponCount) {
            this.weaponCount = weaponCount;
        }

        public String getWeaponBackupId() {
            return weaponBackupId;
        }

        public void setWeaponBackupId(String weaponBackupId) {
            this.weaponBackupId = weaponBackupId;
        }

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }
    }
}
