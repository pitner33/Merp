package com.sol.merp.weapons;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.WeaponSpecType;
import com.sol.merp.attributes.WeaponType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Weapon {
    @Id 
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String name;
    private PlayerActivity activityType;
    private AttackType attackType;
    private CritType critType;
    private CritType secondaryCritType;
    private WeaponType weaponType;
    private WeaponSpecType weaponSpecType;
    private Integer extraTBMH;
    private Integer extraTBOH;
    private Integer rollCapMH;
    private Integer rollCapOH;
    private String critCapMH;
    private String critCapOH;
    private Integer specialModofierTB;
    private Double weight;

    public Weapon(String name, PlayerActivity activityType, AttackType attackType, CritType critType, CritType secondaryCritType, WeaponType weaponType, WeaponSpecType weaponSpecType, Integer extraTBMH, Integer extraTBOH, Integer rollCapMH, Integer rollCapOH, String critCapMH, String critCapOH, Integer specialModofierTB, Double weight) {
        this.name = name;
        this.activityType = activityType;
        this.attackType = attackType;
        this.critType = critType;
        this.secondaryCritType = secondaryCritType;
        this.weaponType = weaponType;
        this.weaponSpecType = weaponSpecType;
        this.extraTBMH = extraTBMH;
        this.extraTBOH = extraTBOH;
        this.rollCapMH = rollCapMH;
        this.rollCapOH = rollCapOH;
        this.critCapMH = critCapMH;
        this.critCapOH = critCapOH;
        this.specialModofierTB = specialModofierTB;
        this.weight = weight;
    }

    // Constructor for base weapons
    public Weapon(String name, PlayerActivity activityType, AttackType attackType, CritType critType, WeaponType weaponType, String critCapMH, String critCapOH) {
        this.name = name;
        this.activityType = activityType;
        this.attackType = attackType;
        this.critType = critType;
        this.secondaryCritType = CritType.none;
        this.weaponType = weaponType;
        this.weaponSpecType = WeaponSpecType.normal;
        this.extraTBMH = 0;
        this.extraTBOH = 0;
        this.rollCapMH = 150;
        this.rollCapOH = 150;
        this.critCapMH = critCapMH;
        this.critCapOH = critCapOH;
        this.specialModofierTB = 0;
        this.weight = 0D;
    }
}
