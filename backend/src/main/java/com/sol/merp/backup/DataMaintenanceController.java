package com.sol.merp.backup;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
@RequestMapping("/api/data")
public class DataMaintenanceController {

    private final BackupService backupService;

    public DataMaintenanceController(BackupService backupService) {
        this.backupService = backupService;
    }

    @DeleteMapping("/player")
    public ResponseEntity<Void> deleteAllPlayerData() {
        try {
            backupService.deleteAllPlayerData();
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/weapon")
    public ResponseEntity<Void> deleteAllWeaponData() {
        try {
            backupService.deleteAllWeaponData();
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
