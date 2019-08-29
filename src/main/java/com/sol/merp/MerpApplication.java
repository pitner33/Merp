package com.sol.merp;

import com.sol.merp.attributes.*;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.diceRoll.D100Roll;
import com.sol.merp.modifiers.AttackModifier;
//import com.sol.merp.modifiers.AttackModifierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MerpApplication implements CommandLineRunner {
    @Autowired
    public PlayerRepository playerRepository;
//    @Autowired
//    public AttackModifierRepository attackModifierRepository;
    @Autowired
    AttackModifier attackModifier;



    public static void main(String[] args) {
        SpringApplication.run(MerpApplication.class, args);

//        Player player = new Player();
//        player.getArmorType();



        for (int i = 0; i < 25; i++) {
            System.out.print(new D100Roll().d100Random()  + ", ");
        }
        System.out.println("");

        for (int i = 0; i < 25; i++) {
            System.out.print(new D100Roll().d100RandomOpen() + ", ");
        }
        System.out.println("");

//        System.out.println(new D100Roll().d100FromRoll("10", "10", "10", "10")); //10
//        System.out.println(new D100Roll().d100FromRoll("96", "10", "10", "10")); //106
//        System.out.println(new D100Roll().d100FromRoll("96", "99", "10", "10")); //205
//        System.out.println(new D100Roll().d100FromRoll("96", "99", "97", "10")); //302
//        System.out.println(new D100Roll().d100FromRoll("5", "10", "10", "10")); //-5
//        System.out.println(new D100Roll().d100FromRoll("5", "97", "10", "10")); //-102
//        System.out.println(new D100Roll().d100FromRoll("5", "97", "98", "10")); //-200
//        System.out.println(new D100Roll().d100FromRoll("5", "15", "98", "10")); //-10
//        System.out.println(new D100Roll().d100FromRoll("96", "15", "98", "10")); //111

        System.out.println("NOW YOU CAN GO!");
    }


    @Override
    public void run(String... args) throws Exception {
        playerRepository.save(new Player("JK1", "Törp harcos", Gender.male, Race.dwarf, PlayerClass.warrior,4, PlayerActivity._3PhisicalAttackOrMovement, AttackType.twoHanded, CritType.slashing, PlayerTarget.NJK1, 86d, 25, 101, 0, -5, -15, 15, false, 15, 40, -5, ArmorType.chainmail, -35, 19, 20, 30, -30, -25, 5, 10));
        playerRepository.save(new Player("JK2", "Tünde íjász", Gender.male, Race.elf, PlayerClass.archer, 3, PlayerActivity._2RangedAttack, AttackType.ranged, CritType.piercing, PlayerTarget.NJK1, 67d, 35, 116, 0, 0, 15, 40, false, 40, 5, 5, ArmorType.heavyLeather, 20, -17, -20, 55, -20, 10, 0, 50));
        playerRepository.save(new Player("JK3", "Dúnadán kósza", Gender.male, Race.human, PlayerClass.ranger,2, PlayerActivity._3PhisicalAttackOrMovement, AttackType.slashing, CritType.slashing, PlayerTarget.NJK3,55d, -10, 39, 0, 0, -20, 5, true, 5, 0, 15, ArmorType.heavyLeather, 44, 11, 10, 25, 20, 5, 0, -16));
        playerRepository.save(new Player("JK4", "Gondori papnö", Gender.female, Race.human, PlayerClass.priest,2, PlayerActivity._2RangedAttack, AttackType.ranged, CritType.piercing, PlayerTarget.NJK3,34d, 25, 115, 0, 9, -6, 15, false, 15, 0, 20, ArmorType.none, 29, -23, -25, -10, 47, 27, 0, -25));
        playerRepository.save(new Player("JK5", "Tünde mágus", Gender.female, Race.elf, PlayerClass.mage, 4, PlayerActivity._2RangedAttack, AttackType.ranged, CritType.heat, PlayerTarget.NJK4,45d, 25, 10, 0, 8, 77, 20, false, 20, 10, 1, ArmorType.none, 25, -15, -15, -5, 38, 43, 0, 35));
        playerRepository.save(new Player("JK6", "Dúnadán harcos", Gender.male, Race.human, PlayerClass.warrior, 3, PlayerActivity._3PhisicalAttackOrMovement, AttackType.slashing, CritType.slashing, PlayerTarget.NJK4,109d, 25, 90, 90, 0, -5, 20, true, 20, 0, 10, ArmorType.chainmail, 25, 23, 10, 30, 15, 5, 15, -5));

        playerRepository.save(new Player("NJK1", "Erös troll", Gender.male, Race.troll, PlayerClass.warrior, 12, PlayerActivity._3PhisicalAttackOrMovement, AttackType.blunt, CritType.blunt, PlayerTarget.JK1, 134d, 15, 106, 0, -45, -45, 30, false, 30, 12, 21, ArmorType.heavyLeather, 31, 6, 6, 6, -45, -45, -45, -45));
        playerRepository.save(new Player("NJK2", "Troll", Gender.male, Race.troll, PlayerClass.warrior, 10, PlayerActivity._3PhisicalAttackOrMovement, AttackType.blunt, CritType.blunt, PlayerTarget.JK2,112d, 10, 88, 0, -45, -45, 20, false, 20, 0, 0, ArmorType.heavyLeather, 26, 4, 4, 4, -45, -45, -45, -45));
        playerRepository.save(new Player("NJK3", "Ork", Gender.male, Race.orc, PlayerClass.warrior, 3, PlayerActivity._3PhisicalAttackOrMovement, AttackType.slashing, CritType.slashing, PlayerTarget.JK3,55d, 15, 50, 0, -45, -45, 10, true, 10, 10, 10, ArmorType.heavyLeather, 20, 20, 20, 20, 5, 5, 0, 25));
        playerRepository.save(new Player("NJK4", "Ork", Gender.male, Race.orc, PlayerClass.archer, 3, PlayerActivity._2RangedAttack, AttackType.ranged, CritType.piercing, PlayerTarget.JK4,55d, 15, 50, 0, -45, -45, 10, true, 10, 10, 10, ArmorType.heavyLeather, 20, 20, 20, 20, 5, 5, 0, 25));
        playerRepository.save(new Player("NJK5", "Ar-Gular", Gender.male, Race.human, PlayerClass.mage, 9, PlayerActivity._2RangedAttack, AttackType.ranged, CritType.heat, PlayerTarget.JK5,73d, 25, 45, 0, 18, -72, 55, false, 15, 15, 5, ArmorType.none, 40, 35, 25, 25, 28, 38, 70, 25));
        playerRepository.save(new Player("NJK6", "Medve", Gender.male, Race.animal, PlayerClass.warrior, 3, PlayerActivity._3PhisicalAttackOrMovement, AttackType.clawsAndFangs, CritType.crushing, PlayerTarget.JK1,150d, 30, 70, 0, -45, -45, 30, false, 15, 0, 0, ArmorType.leather, 40, 60, 0, 0, -45, -45, -45, 10));

//        attackModifierRepository.save(new AttackModifier(true, false, false, false, false, false, false));
        attackModifier.setAttackFromWeakSide(false);
        attackModifier.setAttackFromBehind(false);
        attackModifier.setDefenderSurprised(false);
        attackModifier.setDefenderStunned(false);
        attackModifier.setAttackerWeaponChange(false);
        attackModifier.setAttackerTargetChange(false);
        attackModifier.setAttackerHPBelow50Percent(false);
        attackModifier.setAttackerMoreThan3MetersMovement(false);

    }
}
