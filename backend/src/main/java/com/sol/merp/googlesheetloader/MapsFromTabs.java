package com.sol.merp.googlesheetloader;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@Getter
@Setter
public class MapsFromTabs {
    private Map<Integer, List<String>> mapSlashing;
    private Map<Integer, List<String>> mapBlunt;
    private Map<Integer, List<String>> mapTwoHanded;
    private Map<Integer, List<String>> mapRanged;
    private Map<Integer, List<String>> mapClawsAndFangs;
    private Map<Integer, List<String>> mapGrabOrBalance;
    private Map<Integer, List<String>> mapMagicProjectile;
    private Map<Integer, List<String>> mapMagicBall;
    private Map<Integer, List<String>> mapBaseMagic;
    private Map<Integer, List<String>> mapBaseMagicMD;
    private Map<Integer, List<String>> mapCriticalSlashing;
    private Map<Integer, List<String>> mapCriticalBlunt;
    private Map<Integer, List<String>> mapCriticalPiercing;
    private Map<Integer, List<String>> mapCriticalHeat;
    private Map<Integer, List<String>> mapCriticalCold;
    private Map<Integer, List<String>> mapCriticalElectricity;
    private Map<Integer, List<String>> mapCriticalBalance;
    private Map<Integer, List<String>> mapCriticalCrushing;
    private Map<Integer, List<String>> mapCriticalGrab;
    private Map<Integer, List<String>> mapCriticalBigCreaturePhisical;
    private Map<Integer, List<String>> mapCriticalBigCreatureMagic;
    private Map<Integer, List<String>> mapFail;
    private Map<Integer, List<String>> mapMM;
    private Map<Integer, List<String>> mapOtherManeuver;
}
