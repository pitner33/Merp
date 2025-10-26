package com.sol.merp.diceRoll;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.Random;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Component
public class D100Roll {
    private Integer d100Roll;

    public Integer d100Random() {
        return new Random().nextInt(100) + 1;
    }

    public Integer d100RandomOpen() {
        Integer d100 = d100Random();
        Integer d100Open = d100;

        while (d100 > 95) {
            Integer d100Again = d100Random();
            d100Open += d100Again;
            d100 = d100Again;
        }

        if (d100 < 6) {
            Integer d100Again = d100Random();
            Integer d100Failure = d100Again;

            while (d100Again > 95) {
                Integer d100FailureAgain = d100Random();
                d100Failure += d100FailureAgain;
                d100Again = d100FailureAgain;
            }
            d100Open = d100 - d100Failure;
        }

        return d100Open;
    }

    public Integer d100FromRoll(String roll1, String roll2, String roll3, String roll4) {
        Integer roll1Num = Integer.parseInt(roll1);
        Integer roll2Num = Integer.parseInt(roll2);
        Integer roll3Num = Integer.parseInt(roll3);
        Integer roll4Num = Integer.parseInt(roll4);

        Integer d100OpenFromRoll = roll1Num;

        if (roll1Num < 6) {
            d100OpenFromRoll -= roll2Num;
            if (roll2Num > 95) {
                d100OpenFromRoll -= roll3Num;
                if (roll3Num > 95) {
                    d100OpenFromRoll -= roll4Num;
                }
            }
        }

        if (roll1Num > 95) {
            d100OpenFromRoll += roll2Num;
            if (roll2Num > 95) {
                d100OpenFromRoll += roll3Num;
                if (roll3Num > 95) {
                    d100OpenFromRoll += roll4Num;
                }
            }
        }

        return d100OpenFromRoll;
    }
}
