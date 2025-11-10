package com.sol.merp;

import com.sol.merp.attributes.*;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.diceRoll.D100Roll;
import com.sol.merp.modifiers.AttackModifier;
import com.sol.merp.modifiers.AttackModifierRepository;
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
    @Autowired
    public AttackModifierRepository attackModifierRepository;



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
        if (playerRepository.count() == 0) {
            // Seed Players once
            playerRepository.save(new Player("JK01", "Törp harcos", Gender.male, Race.dwarf, PlayerClass.warrior, 4, 86d, 25, 51, 101, 21, -5, -15, 0, 15, false, 15, 40, -5, ArmorType.chainmail, -35, 19, 20, 30, -30, -25, 5, 10));
            playerRepository.save(new Player("JK02", "Tünde íjász", Gender.male, Race.elf, PlayerClass.archer, 3, 67d, 35, 35, 10, 116, 0, 15, 0, 40, false, 40, 5, 5, ArmorType.heavyLeather, 20, -17, -20, 55, -20, 10, 0, 50));
            playerRepository.save(new Player("JK03", "Dúnadán kósza", Gender.male, Race.human, PlayerClass.ranger, 2, 55d, -10, 39, 10, 26, 0, -20, 0, 5, true, 5, 0, 15, ArmorType.heavyLeather, 44, 11, 10, 25, 20, 5, 0, -16));
            playerRepository.save(new Player("JK04", "Gondori papnö", Gender.female, Race.human, PlayerClass.priest, 2, 34d, 25, 25, -25, 56, 9, -6, 0, 15, false, 15, 0, 20, ArmorType.none, 29, -23, -25, -10, 47, 27, 0, -25));
            playerRepository.save(new Player("JK05", "Tünde mágus", Gender.female, Race.elf, PlayerClass.mage, 4, 45d, 25, 25, -25, 26, 8, 77, 0, 20, false, 20, 10, 1, ArmorType.none, 25, -15, -15, -5, 38, 43, 0, 35));
            playerRepository.save(new Player("JK06", "Dúnadán harcos", Gender.male, Race.human, PlayerClass.warrior, 3, 109d, 25, 90, 30, 55, 0, -5, 65, 20, false, 20, 0, 10, ArmorType.chainmail, 25, 23, 10, 30, 15, 5, 15, -5));
            playerRepository.save(new Player("NJK01", "Ork Warrior", Gender.male, Race.orc, PlayerClass.warrior, 1, 34d, 0, 43, 10, 28, -25, -25, 0, 15, true, 10, 10, 10, ArmorType.heavyLeather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK02", "Ork Warrior", Gender.male, Race.orc, PlayerClass.warrior, 2, 47d, 5, 56, 41, 36, -25, -25, 0, 15, true, 10, 10, 10, ArmorType.heavyLeather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK03", "Ork Warrior", Gender.male, Race.orc, PlayerClass.warrior, 2, 47d, 5, 56, 41, 36, -25, -25, 0, 15, true, 10, 10, 10, ArmorType.heavyLeather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK04", "Ork Warrior", Gender.male, Race.orc, PlayerClass.warrior, 3, 60d, 10, 69, 49, 44, -25, -25, 0, 15, true, 10, 10, 10, ArmorType.heavyLeather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK05", "Ork Warrior", Gender.male, Race.orc, PlayerClass.warrior, 3, 60d, 10, 69, 49, 44, -25, -25, 0, 15, true, 10, 10, 10, ArmorType.heavyLeather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK06", "Ork Archer", Gender.male, Race.orc, PlayerClass.archer, 1, 34d, 0, 28, 10, 43, -25, -25, 0, 15, false, 10, 10, 10, ArmorType.leather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK07", "Ork Archer", Gender.male, Race.orc, PlayerClass.archer, 2, 47d, 5, 36, 41, 56, -25, -25, 0, 15, false, 10, 10, 10, ArmorType.leather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK08", "Ork Archer", Gender.male, Race.orc, PlayerClass.archer, 2, 47d, 5, 36, 41, 56, -25, -25, 0, 15, false, 10, 10, 10, ArmorType.leather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK09", "Ork Archer", Gender.male, Race.orc, PlayerClass.archer, 3, 60d, 10, 44, 49, 69, -25, -25, 0, 15, false, 10, 10, 10, ArmorType.leather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK10", "Ork Archer", Gender.male, Race.orc, PlayerClass.archer, 3, 60d, 10, 44, 49, 69, -25, -25, 0, 15, false, 10, 10, 10, ArmorType.leather, 5, 5, 5, 5, -25, -25, 5, 5));
            playerRepository.save(new Player("NJK11", "Erös troll", Gender.male, Race.troll, PlayerClass.warrior, 12, 134d, 15, 106, 50, 56, -25, -25, 0, 30, false, 30, 12, 21, ArmorType.heavyLeather, 31, 6, 6, 6, -45, -45, -45, -45));
            playerRepository.save(new Player("NJK12", "Troll", Gender.male, Race.troll, PlayerClass.warrior, 10, 112d, 10, 88, 40, 46, -25, -25, 0, 20, false, 20, 0, 0, ArmorType.heavyLeather, 26, 4, 4, 4, -45, -45, -45, -45));
            playerRepository.save(new Player("NJK13", "Ar-Gular", Gender.male, Race.human, PlayerClass.mage, 9, 73d, 25, 25, -5, 35, 18, 72, 0, 55, false, 15, 15, 5, ArmorType.none, 40, 35, 25, 25, 28, 38, 70, 25));
            playerRepository.save(new Player("NJK14", "Medve", Gender.male, Race.animal, PlayerClass.warrior, 3, 150d, 30, 70, -25, -25, -25, -25, 0, 30, false, 15, 0, 0, ArmorType.leather, 40, 60, 0, 0, -45, -45, -45, 10));

            // Create default AttackModifier per Player
            for (Player p : playerRepository.findAll()) {
                if (attackModifierRepository.findByPlayer_Id(p.getId()).isEmpty()) {
                    AttackModifier am = new AttackModifier();
                    am.setPlayer(p);
                    am.setAttackFromWeakSide(false);
                    am.setAttackFromBehind(false);
                    am.setDefenderSurprised(false);
                    am.setDefenderStunned(false);
                    am.setAttackerWeaponChange(false);
                    am.setAttackerTargetChange(false);
                    am.setAttackerHPBelow50Percent(false);
                    am.setAttackerMoreThan3MetersMovement(false);
                    am.setModifierByGameMaster(0);
                    attackModifierRepository.save(am);
                }
            }
        }

    }
}
