package com.sol.merp.mm;

import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.fight.FightServiceImpl;
import com.sol.merp.googlesheetloader.MapsFromTabs;
import com.sol.merp.mm.dto.MMFailResponse;
import com.sol.merp.mm.dto.MMResolveResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MMServiceImpl implements MMService {

    @Autowired
    private MapsFromTabs mapsFromTabs;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private FightServiceImpl fightService; // reuse fail application logic

    private int clamp(int val, int min, int max) {
        return Math.max(min, Math.min(max, val));
    }

    @Override
    public MMResolveResponse resolve(String mmType, String maneuverType, String difficulty, int modifiedRoll) {
        MMResolveResponse res = new MMResolveResponse();
        if ("Movement".equalsIgnoreCase(mmType)) {
            int rowKey = clamp(modifiedRoll, -150, 275);
            Map<Integer, List<String>> mm = mapsFromTabs.getMapMM();
            List<String> row = mm.get(rowKey);
            int col = difficultyToCol(difficulty);
            String text = (row != null && col >= 1 && col <= row.size()) ? row.get(col - 1) : "";
            res.setResultText(text != null ? text : "");
            res.setUsedRow(rowKey);
            res.setUsedCol(col);
            res.setFailRequired("Fail".equalsIgnoreCase(text));
            return res;
        } else {
            int rowKey = clamp(modifiedRoll, -25, 175);
            Map<Integer, List<String>> other = mapsFromTabs.getMapOtherManeuver();
            List<String> row = other.get(rowKey);
            int col = maneuverTypeToCol(maneuverType);
            String text = (row != null && col >= 1 && col <= row.size()) ? row.get(col - 1) : "";
            res.setResultText(text != null ? text : "");
            res.setUsedRow(rowKey);
            res.setUsedCol(col);
            res.setFailRequired(false);
            return res;
        }
    }

    private int difficultyToCol(String d) {
        if (d == null) return 4; // default Average
        String s = d.trim().toLowerCase();
        switch (s) {
            case "piece of cake": return 1;
            case "very easy": return 2;
            case "easy": return 3;
            case "average": return 4;
            case "hard": return 5;
            case "very hard": return 6;
            case "extremely hard": return 7;
            case "insane": return 8;
            case "absurd": return 9;
            default: return 4;
        }
    }

    private int maneuverTypeToCol(String t) {
        if (t == null) return 1;
        String s = t.trim().toLowerCase();
        if (s.equals("influence")) return 2;
        if (s.equals("lockpicking") || s.equals("disarm traps")) return 3;
        if (s.equals("object usage") || s.equals("runes")) return 4;
        if (s.equals("perception") || s.equals("tracking")) return 5;
        return 1; // other
    }

    @Override
    public MMFailResponse getFailText(int failRoll) {
        int r = clamp(failRoll, 5, 120);
        List<String> row = mapsFromTabs.getMapFail().get(r);
        String text = (row != null && row.size() > 3) ? row.get(3) : ""; // COL4 for MM text
        MMFailResponse resp = new MMFailResponse();
        resp.setFailResultText(text != null ? text : "");
        resp.setApplied(false);
        return resp;
    }

    @Override
    public MMFailResponse applyFail(Long playerId, int failRoll) {
        MMFailResponse resp = new MMFailResponse();
        if (playerId == null) {
            resp.setFailResultText("");
            resp.setApplied(false);
            return resp;
        }
        Player attacker = playerRepository.findById(playerId).orElse(null);
        if (attacker == null) {
            resp.setFailResultText("");
            resp.setApplied(false);
            return resp;
        }
        int r = clamp(failRoll, 5, 120);
        List<String> row = mapsFromTabs.getMapFail().get(r);
        String text = (row != null && row.size() > 3) ? row.get(3) : ""; // COL4 text for MM

        // Apply MM block effects: cols 20-24 -> idx 19..23
        try {
            if (row != null) {
                int startIdx = 19;
                // extra damage
                if (row.size() > startIdx) {
                    Integer extra = parseIntSafe(row.get(startIdx));
                    if (extra != null && extra > 0) attacker.setHpActual(attacker.getHpActual() - extra);
                }
                // hp loss per round
                if (row.size() > startIdx + 1) {
                    Integer bleed = parseIntSafe(row.get(startIdx + 1));
                    if (bleed != null && bleed > 0) attacker.setHpLossPerRound(attacker.getHpLossPerRound() + bleed);
                }
                // stunned rounds
                if (row.size() > startIdx + 2) {
                    Integer stun = parseIntSafe(row.get(startIdx + 2));
                    if (stun != null && stun > 0) {
                        attacker.setStunnedForRounds(attacker.getStunnedForRounds() + stun);
                        attacker.setIsStunned(true);
                        attacker.setIsActive(false);
                    }
                }
                // penalty value or value/duration
                if (row.size() > startIdx + 3) {
                    String penStr = row.get(startIdx + 3);
                    if (penStr != null && !penStr.isBlank()) {
                        Integer val = null; Integer dur = null;
                        if (penStr.contains("/")) {
                            String[] parts = penStr.split("/");
                            if (parts.length >= 1) val = parseIntSafe(parts[0]);
                            if (parts.length >= 2) dur = parseIntSafe(parts[1]);
                        } else {
                            val = parseIntSafe(penStr);
                        }
                        if (val != null && val != 0) attacker.addPenaltyEffect(Math.abs(val), Math.max(1, dur != null ? dur : 1));
                    }
                }
                // instant death flag "1"
                if (row.size() > startIdx + 4) {
                    boolean dead = "1".equals(row.get(startIdx + 4));
                    if (dead) {
                        attacker.setIsAlive(false);
                        attacker.setIsActive(false);
                        attacker.setIsStunned(false);
                        attacker.setStunnedForRounds(0);
                    }
                }
            }
        } catch (Exception ignore) {}

        playerRepository.save(attacker);

        resp.setFailResultText(text != null ? text : "");
        resp.setApplied(true);
        return resp;
    }

    private Integer parseIntSafe(String s) {
        try { return s == null || s.isBlank() ? null : Integer.parseInt(s.trim()); }
        catch (Exception ex) { return null; }
    }
}
