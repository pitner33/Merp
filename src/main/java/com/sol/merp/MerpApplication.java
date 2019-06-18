package com.sol.merp;

import DiceRoll.D100Roll;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MerpApplication {

    public static void main(String[] args) {
        SpringApplication.run(MerpApplication.class, args);

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


}
