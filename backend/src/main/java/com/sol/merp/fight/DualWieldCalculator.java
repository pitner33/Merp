package com.sol.merp.fight;

public final class DualWieldCalculator {

    private DualWieldCalculator() {
    }

    public static int computeMainHandTb(Integer tbOneHanded, Integer dualWield) {
        int base = tbOneHanded != null ? tbOneHanded : 0;
        int skill = dualWield != null ? dualWield : 0;
        if (skill <= 0) {
            return base;
        }
        double factor;
        if (skill <= 1) {
            factor = 0.75d;
        } else if (skill >= 65) {
            factor = 1.0d;
        } else {
            double ratio = (skill - 1d) / (65d - 1d);
            factor = 0.75d + ratio * (1.0d - 0.75d);
        }
        return (int) Math.round(base * factor);
    }

    public static int computeOffHandTb(Integer tbOneHanded, Integer dualWield) {
        int base = tbOneHanded != null ? tbOneHanded : 0;
        int skill = dualWield != null ? dualWield : 0;
        if (skill <= 0 || base == 0) {
            return 0;
        }
        double factor;
        if (skill <= 1) {
            factor = 0.25d;
        } else if (skill <= 65) {
            double ratio = (skill - 1d) / (65d - 1d);
            factor = 0.25d + ratio * (0.5d - 0.25d);
        } else if (skill <= 110) {
            double ratio = (skill - 65d) / (110d - 65d);
            factor = 0.5d + ratio * (1.0d - 0.5d);
        } else {
            factor = 1.0d;
        }
        return (int) Math.round(base * factor);
    }
}
