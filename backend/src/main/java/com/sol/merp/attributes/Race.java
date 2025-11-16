package com.sol.merp.attributes;

public enum Race {
    dwarf("Dwarf"),
    umli("Umli"),
    nolda("Nolda"),
    sinda("Sinda"),
    woodElf("Wood-elf"),
    halfElf("Half-elf"),
    hobbit("Hobbit"),
    humanBeorns("Beorn"),
    humanBlackNumenor("Black Numenor"),
    humanPirates("Pirates"),
    humanDorwin("Dorwin"),
    humanDunadan("Dúnadan"),
    humanDun("Dún"),
    humanEastlands("Eastlands"),
    humanEriador("Eriador"),
    humanGondor("Gondor"),
    humanHarad("Harad"),
    humanLossoth("Lossoth"),
    humanRohir("Rohír"),
    humanVarag("Varag"),
    humanWoodmen("Woodsmen"),
    wose("Wose"),
    orc("Orc"),
    urukHai("Uruk-hai"),
    halfOrc("Half-orc"),
    troll("Troll"),
    ologHai("Olog-hai"),
    halfTroll("Half-troll"),
    animal("Animal"),
    monster("Monster");

    private final String displayName;

    Race(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
