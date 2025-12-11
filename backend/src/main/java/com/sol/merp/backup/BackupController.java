package com.sol.merp.backup;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
@RequestMapping("/api/backups")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    public static class CreateWeaponBackupRequest {
        private String label;

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }
    }

    public static class CreatePlayerBackupRequest {
        private String label;
        private String weaponBackupId;

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public String getWeaponBackupId() {
            return weaponBackupId;
        }

        public void setWeaponBackupId(String weaponBackupId) {
            this.weaponBackupId = weaponBackupId;
        }
    }

    public static class RestoreWeaponRequest {
        private BackupDomain.RestoreMode mode;

        public BackupDomain.RestoreMode getMode() {
            return mode;
        }

        public void setMode(BackupDomain.RestoreMode mode) {
            this.mode = mode;
        }
    }

    public static class RestorePlayerRequest {
        private BackupDomain.RestoreMode mode;
        private boolean restorePairedWeapon;

        public BackupDomain.RestoreMode getMode() {
            return mode;
        }

        public void setMode(BackupDomain.RestoreMode mode) {
            this.mode = mode;
        }

        public boolean isRestorePairedWeapon() {
            return restorePairedWeapon;
        }

        public void setRestorePairedWeapon(boolean restorePairedWeapon) {
            this.restorePairedWeapon = restorePairedWeapon;
        }
    }

    @GetMapping("/weapon")
    public List<BackupDomain.BackupMetadata> listWeaponBackups() {
        return backupService.listBackups(BackupDomain.BackupType.WEAPON);
    }

    @PostMapping("/weapon")
    public ResponseEntity<BackupDomain.BackupMetadata> createWeaponBackup(
            @RequestBody(required = false) CreateWeaponBackupRequest request) {
        String label = request != null ? request.getLabel() : null;
        try {
            BackupDomain.BackupMetadata created = backupService.createWeaponBackup(label);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/weapon/{backupId}/download")
    public ResponseEntity<WeaponBackupPayload> downloadWeaponBackup(@PathVariable("backupId") String backupId) {
        try {
            WeaponBackupPayload payload = backupService.loadWeaponBackupPayload(backupId);
            return ResponseEntity.ok(payload);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/weapon/import")
    public ResponseEntity<BackupDomain.BackupMetadata> importWeaponBackup(@RequestBody WeaponBackupPayload payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            BackupDomain.BackupMetadata created = backupService.importWeaponBackup(payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/weapon/{backupId}")
    public ResponseEntity<Void> deleteWeaponBackup(@PathVariable("backupId") String backupId) {
        try {
            backupService.deleteBackup(BackupDomain.BackupType.WEAPON, backupId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/weapon/{backupId}/restore")
    public ResponseEntity<Void> restoreWeaponBackup(
            @PathVariable("backupId") String backupId,
            @RequestBody(required = false) RestoreWeaponRequest request) {
        BackupDomain.RestoreMode mode = request != null ? request.getMode() : null;
        try {
            backupService.restoreWeaponBackup(backupId, mode);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/player")
    public List<BackupDomain.BackupMetadata> listPlayerBackups() {
        return backupService.listBackups(BackupDomain.BackupType.PLAYER);
    }

    @PostMapping("/player")
    public ResponseEntity<BackupDomain.BackupMetadata> createPlayerBackup(
            @RequestBody(required = false) CreatePlayerBackupRequest request) {
        String label = request != null ? request.getLabel() : null;
        String weaponBackupId = request != null ? request.getWeaponBackupId() : null;
        try {
            BackupDomain.BackupMetadata created = backupService.createPlayerBackup(label, weaponBackupId);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/player/{backupId}/restore")
    public ResponseEntity<Void> restorePlayerBackup(
            @PathVariable("backupId") String backupId,
            @RequestBody(required = false) RestorePlayerRequest request) {
        BackupDomain.RestoreMode mode = request != null ? request.getMode() : null;
        boolean restorePairedWeapon = request != null && request.isRestorePairedWeapon();
        try {
            backupService.restorePlayerBackup(backupId, mode, restorePairedWeapon);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/player/{backupId}/download")
    public ResponseEntity<PlayerBackupPayload> downloadPlayerBackup(@PathVariable("backupId") String backupId) {
        try {
            PlayerBackupPayload payload = backupService.loadPlayerBackupPayload(backupId);
            return ResponseEntity.ok(payload);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/player/import")
    public ResponseEntity<BackupDomain.BackupMetadata> importPlayerBackup(@RequestBody PlayerBackupPayload payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            BackupDomain.BackupMetadata created = backupService.importPlayerBackup(payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/player/{backupId}")
    public ResponseEntity<Void> deletePlayerBackup(@PathVariable("backupId") String backupId) {
        try {
            backupService.deleteBackup(BackupDomain.BackupType.PLAYER, backupId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
