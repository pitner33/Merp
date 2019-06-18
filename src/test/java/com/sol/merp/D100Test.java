package com.sol.merp;


import com.sol.merp.diceRoll.D100Roll;
import org.junit.Test;

import static org.junit.Assert.*;

public class D100Test {
    public D100Roll test = new D100Roll();

    @Test
    public void d100FromRoll_GivesRightResults() {
        Integer result10 = 10;
        Integer result106 = 106;
        Integer result205 = 205;
        Integer result302 = 302;
        Integer resultNegative5 = -5;
        Integer resultNegative102 = -102;
        Integer resultNegative200 = -200;
        Integer resultNegative10 = -10;
        Integer result111 = 111;

        assertEquals(result10, test.d100FromRoll("10", "10", "10", "10"));
        assertEquals(result106, test.d100FromRoll("96", "10", "10", "10"));
        assertEquals(result205, test.d100FromRoll("96", "99", "10", "10"));
        assertEquals(result302, test.d100FromRoll("96", "99", "97", "10"));
        assertEquals(resultNegative5, test.d100FromRoll("5", "10", "10", "10"));
        assertEquals(resultNegative102, test.d100FromRoll("5", "97", "10", "10"));
        assertEquals(resultNegative200, test.d100FromRoll("5", "97", "98", "10"));
        assertEquals(resultNegative10, test.d100FromRoll("5", "15", "98", "10"));
        assertEquals(result111, test.d100FromRoll("96", "15", "98", "10"));
    }
}
