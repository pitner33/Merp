package com.sol.merp;

import com.sol.merp.attributes.ArmorType;
import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.diceRoll.D100Roll;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MerpApplication implements CommandLineRunner {
    @Autowired
    public PlayerRepository playerRepository;



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

        System.out.println(new D100Roll().d100FromRoll("10", "10", "10", "10")); //10
        System.out.println(new D100Roll().d100FromRoll("96", "10", "10", "10")); //106
        System.out.println(new D100Roll().d100FromRoll("96", "99", "10", "10")); //205
        System.out.println(new D100Roll().d100FromRoll("96", "99", "97", "10")); //302
        System.out.println(new D100Roll().d100FromRoll("5", "10", "10", "10")); //-5
        System.out.println(new D100Roll().d100FromRoll("5", "97", "10", "10")); //-102
        System.out.println(new D100Roll().d100FromRoll("5", "97", "98", "10")); //-200
        System.out.println(new D100Roll().d100FromRoll("5", "15", "98", "10")); //-10
        System.out.println(new D100Roll().d100FromRoll("96", "15", "98", "10")); //111



    }


    @Override
    public void run(String... args) throws Exception {
        playerRepository.save(new Player("JK1", "Törp harcos", 4, AttackType.twoHanded, CritType.slashing, 86, 25, 101, 0, -5, -15, 15, false, 15, 40, -5, ArmorType.chainmail, -35, 19, 20, 30, -30, -25, 5, 10));
        playerRepository.save(new Player("NJK1", "Erős troll", 12, AttackType.blunt, CritType.blunt, 134, 15, 0, 0, -45, -45, 30, false, 30, 12, 21, ArmorType.heavyLeather, 31, 6, 6, 6, -45, -45, -45, -45));

    }
}
