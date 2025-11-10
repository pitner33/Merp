package com.sol.merp.characters;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.PlayerTarget;
import com.sol.merp.attributes.CritType;
import com.sol.merp.dto.AttackResultsDTO;
import com.sol.merp.fight.FightCount;
import com.sol.merp.fight.DualWieldCalculator;
import com.sol.merp.modifiers.AttackModifierService;
import com.sol.merp.modifiers.ExperienceModifiers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PlayerServiceImpl implements PlayerService {
    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    FightCount fightCount;

    @Autowired
    PlayerListObject adventurerOrderedListObject;

    @Autowired
    NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject;

    @Autowired
    ExperienceModifiers experienceModifiers;

    @Autowired
    AttackModifierService attackModifierService;

    // Temporary buffer to keep ACTIVE players list across next-round calls
    private List<Player> activePlayersBuffer = null; // null means not initialized for the current round
    private static final Pattern CHARACTER_ID_PATTERN = Pattern.compile("^(N?JK)(\\d{1,2})$");

    private String normalizeCharacterId(String rawId) {
        if (rawId == null) {
            return null;
        }
        String trimmed = rawId.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if ("none".equalsIgnoreCase(trimmed)) {
            return "none";
        }
        Matcher matcher = CHARACTER_ID_PATTERN.matcher(trimmed.toUpperCase());
        if (!matcher.matches()) {
            return trimmed.toUpperCase();
        }
        int number = Integer.parseInt(matcher.group(2));
        if (number < 1 || number > 99) {
            return trimmed.toUpperCase();
        }
        return matcher.group(1) + String.format("%02d", number);
    }

    private Player resolveTargetPlayer(PlayerTarget target) {
        if (target == null || target == PlayerTarget.none) {
            return null;
        }
        String raw = target.name();
        String normalized = normalizeCharacterId(raw);
        Player found = normalized != null ? playerRepository.findByCharacterId(normalized) : null;
        if (found == null && normalized != null && !normalized.equalsIgnoreCase(raw)) {
            found = playerRepository.findByCharacterId(raw.toUpperCase());
        }
        return found;
    }

    @Override
    public void changeIsPlayStatus(Player player) {
        if (player.getIsPlaying()) {
            player.setIsPlaying(false);
        } else player.setIsPlaying(true);
        playerRepository.save(player);
    }

    @Override
    public void resetActivePlayersBuffer() {
        this.activePlayersBuffer = null;
    }

    @Override
    public void playerActivitySwitch() {
        List<Player> allPlayers = playerRepository.findAll();
        for (Player player : allPlayers) {
            if (player.getIsStunned() || playerDead(player) || player.getPlayerActivity().equals(PlayerActivity._4PrepareMagic) || player.getPlayerActivity().equals(PlayerActivity._5DoNothing)) {
                player.setIsActive(false);

            } else player.setIsActive(true);
            playerRepository.save(player);
        }
    }

    @Override
    public void doNothingWhenStunned() {
        List<Player> allPlayers = playerRepository.findAll();
        for (Player player : allPlayers) {
            if (player.getIsStunned()) {
                player.setPlayerActivity(PlayerActivity._5DoNothing);
                playerRepository.save(player);
            }
        }
    }

    @Override
    public void revivePlayer(Player player) {
        player.setIsAlive(true);
        player.setIsActive(true);
        player.setIsStunned(false);
        player.setStunnedForRounds(0);
        player.setHpActual(player.getHpMax());
        player.setTbUsedForDefense(0);
        // Clear penalties and ongoing effects fully (ElementCollection must be cleared on managed list)
        if (player.getActivePenaltyEffects() != null) {
            player.getActivePenaltyEffects().clear();
        } else {
            player.setActivePenaltyEffects(new java.util.ArrayList<>());
        }
        player.recomputePenaltyOfActions();
        player.setHpLossPerRound(0);

        playerRepository.save(player);
    }

    @Override
    public Boolean playerDead(Player player) {
        if (player.getHpActual() <= 0) {
            return true;
        }
        return false;
    }

    @Override
    public Boolean isPlayerHealthBelow50percent(Player player) {
        Double hpActual = player.getHpActual();
        Double hpMax = player.getHpMax();
        Double hpPercent = hpActual / hpMax;
        if (hpPercent <= 0.5) {
            return true;
        }
        return false;
    }

    //get the players who are playing in the adventure and ordered them (dead/stunned/donothindORpreparemagic/mm/activity ORDER from bottom to top
    //put them in a list, wrap it into an object
    //the method is called ONLY at the beginning of a new round
    //during the round after each and every fight defender stats are refreshed in the object!s list KEEPING the order and number of players (void refreshAdventurerOrderedListObject(Player defender))
    @Override
    public List<Player> adventurersOrderedList() {
        List<Player> allWhoPlays = playerRepository.findAllByIsPlayingIsTrue();

        // Ensure displayed penalty matches active effects (e.g., after revive/reset)
        for (Player p : allWhoPlays) {
            if (p != null) {
                p.recomputePenaltyOfActions();
                playerRepository.save(p);
            }
        }

        Comparator<Player> orderByStatusActivityMm =
                Comparator
                        .comparing((Player p) -> this.playerDead(p))                  // false (alive) first
                        .thenComparing(Player::getIsStunned)                          // false (not stunned) first
                        .thenComparing((Player p) -> !p.getIsActive())                // false (active) first
                        .thenComparing(p -> p.getPlayerActivity().ordinal())          // activity 1..5
                        .thenComparing(Player::getMm, Comparator.reverseOrder());     // MM high->low

        allWhoPlays.sort(orderByStatusActivityMm);
        System.out.println(allWhoPlays.toString());
        System.out.println(allWhoPlays.getClass());
        adventurerOrderedListObject.setPlayerList(allWhoPlays);

        adventurerOrderedListObject.getPlayerList().forEach(this::checkIfTargetIsInOrderedList);
        return allWhoPlays;
    }

    //checks if player's target was in ordered list, and if not, set to inactive
    @Override
    public void checkIfTargetIsInOrderedList(Player attacker) {
        Player target = resolveTargetPlayer(attacker.getTarget());
        List<Player> ordered = adventurerOrderedListObject.getPlayerList();
        boolean targetPresent = target != null && ordered != null && ordered.stream().anyMatch(p -> Objects.equals(p.getId(), target.getId()));

        if (!targetPresent) {
            attacker.setTarget(PlayerTarget.none);
            attacker.setIsActive(false);
        }
    }

    @Override
    public List<Player> activePlayersAsOnAdventureFight() {
        // If already initialized (even if empty), return a copy to reflect current state
        if (this.activePlayersBuffer != null) {
            return new ArrayList<>(this.activePlayersBuffer);
        }
        // Initialize from the ordered list (first call in a round)
        List<Player> base = adventurerOrderedListObject.getPlayerList();
        if (base == null || base.isEmpty()) {
            base = adventurersOrderedList();
        }
        List<Player> active = new ArrayList<>();
        for (Player p : base) {
            if (Boolean.TRUE.equals(p.getIsActive())) {
                active.add(p);
            }
        }
        // store for subsequent consumption
        this.activePlayersBuffer = new ArrayList<>(active);
        return new ArrayList<>(this.activePlayersBuffer);
    }

    //picks the next ACTIVE player from the provided list as attacker, and its target, put them into a list and wrap the list into an object
    @Override
    public NextTwoPlayersToFigthObject nextPlayersToFight(List<Player> activePlayers) throws Exception { //TODO atalakitani hogz nextTwoPlayerObjectet adjon vissza + vegigkovetni a valtozat mashol is

        // Do NOT initialize from the provided list; buffer is managed by the service lifecycle
        if (this.activePlayersBuffer == null || this.activePlayersBuffer.isEmpty()) {
            nextTwoPlayersToFigthObject.setNextTwoPlayersToFight(Collections.emptyList());
            return nextTwoPlayersToFigthObject;
        }

        Player attackerFromList = this.activePlayersBuffer.get(0);
        Player attacker = attackerFromList != null ? playerRepository.findByCharacterId(normalizeCharacterId(attackerFromList.getCharacterId())) : null;
        if (attacker == null) {
            nextTwoPlayersToFigthObject.setNextTwoPlayersToFight(Collections.emptyList());
            return nextTwoPlayersToFigthObject;
        }

        Player defender = resolveTargetPlayer(attacker.getTarget());
        if (defender == null) {
            attacker.setTarget(PlayerTarget.none);
            playerRepository.save(attacker);
            nextTwoPlayersToFigthObject.setNextTwoPlayersToFight(Collections.singletonList(attacker));
            return nextTwoPlayersToFigthObject;
        }

        List<Player> nextTwoPLayersToFight = new ArrayList<>();
        nextTwoPLayersToFight.add(attacker);
        nextTwoPLayersToFight.add(defender);

        nextTwoPlayersToFigthObject.setNextTwoPlayersToFight(nextTwoPLayersToFight);
        // consume the attacker from the buffer for subsequent rounds
        if (!this.activePlayersBuffer.isEmpty()) {
            this.activePlayersBuffer.remove(0);
        }
        return nextTwoPlayersToFigthObject;


        //       List<Player> orderedList = adventurerOrderedListObject.getPlayerList();
//
//        fightCount.setFightCountMax(orderedList.size());
//
//        if (fightCount.getFightCount() <= fightCount.getFightCountMax()) {
//            Player attacker = orderedList.get(fightCount.getFightCount() - 1);
//            while (!attacker.getIsActive()) {
//                fightCount.setFightCount(fightCount.getFightCount() + 1);
//                if (fightCount.getFightCount() > fightCount.getFightCountMax()) {
//                    break;
//                }
//                attacker = orderedList.get(fightCount.getFightCount() - 1);
//            }

//            String defenderCharacterId = attacker.getTarget().toString();
//            Player defender = playerRepository.findByCharacterId(defenderCharacterId);

//            List<Player> nextTwoPLayersToFight = new ArrayList<>();
//            nextTwoPLayersToFight.add(attacker);
//            nextTwoPLayersToFight.add(defender);

//            nextTwoPlayersToFigthObject.setNextTwoPlayersToFight(nextTwoPLayersToFight);

//            return nextTwoPlayersToFigthObject;
//        } else return nextTwoPlayersToFigthObject;
    }

    // Backward-compatible overload used by legacy MVC controller paths
    @Override
    public NextTwoPlayersToFigthObject nextPlayersToFight() throws Exception {
        // Initialize buffer only if it hasn't been initialized for this round
        if (this.activePlayersBuffer == null) {
            List<Player> base = adventurerOrderedListObject.getPlayerList();
            if (base == null || base.isEmpty()) {
                base = adventurersOrderedList();
            }
            List<Player> active = new ArrayList<>();
            for (Player p : base) {
                if (Boolean.TRUE.equals(p.getIsActive())) {
                    active.add(p);
                }
            }
            this.activePlayersBuffer = new ArrayList<>(active);
        }
        return nextPlayersToFight(Collections.emptyList());
    }

    @Override
    public List<Player> stunnedPlayers() {
        return adventurersOrderedList().stream()
                .filter(player -> player.getIsStunned())
                .collect(Collectors.toList());
    }

    @Override
    public List<Player> deadPlayers() {
        return adventurersOrderedList().stream()
                .filter(player -> player.getHpActual() <= 0)
                .collect(Collectors.toList());
    }

    @Override
    public List<PlayerTarget> targetablePlayerList() {
        List<PlayerTarget> playerTargetValues = Arrays.asList(PlayerTarget.values());
        List<PlayerTarget> targetsFromOrderedList = new ArrayList<>();
        targetsFromOrderedList.add(PlayerTarget.none);

        adventurerOrderedListObject.getPlayerList().forEach(player -> {
            String charId = normalizeCharacterId(player.getCharacterId());
            for (PlayerTarget playerTargetValue : playerTargetValues) {
                String targetName = normalizeCharacterId(playerTargetValue.name());
                if (charId != null && charId.equals(targetName) && !targetsFromOrderedList.contains(playerTargetValue)) {
                    targetsFromOrderedList.add(playerTargetValue);
                }
            }
        });
        Collections.sort(targetsFromOrderedList);
        return targetsFromOrderedList;
    }

    @Override
    public Double healthPercent(Player player) {
        return ((player.getHpActual() / player.getHpMax()) * 100);
    }

    //Refreshing the ordered list object with defendet stats KEEPING the order of the list and the players in it
    //it is used after each and every fight during a round
    @Override
    public void refreshAdventurerOrderedListObject(Player defender) {
        List<Player> newOrderedList = new ArrayList<>();

        checkAndSetStats(defender); // also saves the defender to the repo
        for (int i = 0; i < adventurerOrderedListObject.getPlayerList().size(); i++) {
            if (adventurerOrderedListObject.getPlayerList().get(i).getId().equals(defender.getId())) {
                newOrderedList.add(defender);
            } else newOrderedList.add(adventurerOrderedListObject.getPlayerList().get(i));
        }
        adventurerOrderedListObject.setPlayerList(newOrderedList);
    }

    @Override
    public void checkAndSetStats(Player player) {
        // Normalize nulls
        if (player.getHpActual() == null) player.setHpActual(0D);
        if (player.getStunnedForRounds() == null) player.setStunnedForRounds(0);

        // If already marked dead, enforce dead invariants
        if (Boolean.FALSE.equals(player.getIsAlive())) {
            player.setHpActual(0D);
            player.setIsActive(false);
            player.setIsStunned(false);
            player.setStunnedForRounds(0);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
            player.setAttackType(AttackType.none);
            player.setCritType(CritType.none);
            player.setTarget(PlayerTarget.none);
            player.setTb(0);
            player.setTbOffHand(0);
            player.setTbUsedForDefense(0);
        }

        // HP reaching 0 -> dead, and enforce dead invariants
        if (player.getHpActual() <= 0) {
            player.setHpActual(0D);
            player.setIsAlive(false);
            player.setIsActive(false);
            player.setIsStunned(false);
            player.setStunnedForRounds(0);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
            player.setAttackType(AttackType.none);
            player.setCritType(CritType.none);
            player.setTarget(PlayerTarget.none);
            player.setTb(0);
            player.setTbOffHand(0);
            player.setTbUsedForDefense(0);
        }

        // Stunned logic
        if (player.getStunnedForRounds() <= 0) {
            player.setStunnedForRounds(0);
            player.setIsStunned(false);
        } else {
            player.setIsStunned(true);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
            player.setIsActive(false);
        }

        // Target none -> default to DoNothing (unless explicitly PrepareMagic)
        if (player.getTarget() == PlayerTarget.none && player.getPlayerActivity() != PlayerActivity._4PrepareMagic) {
            player.setPlayerActivity(PlayerActivity._5DoNothing);
        }

        // Activity rules: DoNothing -> Attack none, Crit none; also affects active flag
        if (player.getPlayerActivity() == PlayerActivity._5DoNothing) {
            player.setAttackType(AttackType.none);
            player.setCritType(CritType.none);
            player.setIsActive(false);
        } else if (player.getPlayerActivity() == PlayerActivity._4PrepareMagic) {
            player.setIsActive(false);
        } else {
            player.setIsActive(true);
        }

        // Set TB by attack selection
        setTbBasedOnAttackType(player);

        // Cap TB used for defense: if TB < 0 -> set to 0 immediately; else clamp to [0, tb/2]
        Integer tb = player.getTb();
        Integer tbDef = player.getTbUsedForDefense();
        if (tbDef == null) tbDef = 0;
        if (tb != null && tb < 0) {
            tbDef = 0;
        } else {
            if (tbDef < 0) tbDef = 0;
            int maxDef = (tb != null ? tb : 0) / 2;
            if (maxDef < 0) maxDef = 0;
            if (tbDef > maxDef) tbDef = maxDef;
        }
        player.setTbUsedForDefense(tbDef);

        playerRepository.save(player);
    }

    @Override
    public void setTbBasedOnAttackType(Player player) {
        AttackType at = player.getAttackType();
        if (at == null) {
            // Keep existing TB when attack type is not set (consistent with ApiController.computeTb)
            return;
        }
        switch (at) {
            case slashing:
            case blunt:
            case clawsAndFangs:
            case grabOrBalance:
                player.setTb(player.getTbOneHanded());
                player.setTbOffHand(0);
                break;
            case dualWield: {
                int main = DualWieldCalculator.computeMainHandTb(player.getTbOneHanded(), player.getDualWield());
                int off = DualWieldCalculator.computeOffHandTb(player.getTbOneHanded(), player.getDualWield());
                player.setTb(main);
                player.setTbOffHand(off);
                break;
            }
            case twoHanded:
                player.setTb(player.getTbTwoHanded());
                player.setTbOffHand(0);
                break;
            case ranged:
                player.setTb(player.getTbRanged());
                player.setTbOffHand(0);
                break;
            case baseMagic:
                player.setTb(player.getTbBaseMagic());
                player.setTbOffHand(0);
                break;
            case magicBall:
            case magicProjectile:
                player.setTb(player.getTbTargetMagic());
                player.setTbOffHand(0);
                break;
            case none:
                player.setTb(0);
                player.setTbOffHand(0);
                player.setCritType(CritType.none);
                break;
            default:
                player.setTb(0);
                player.setTbOffHand(0);
        }

    }

    //Adds experience points after each and every action
    @Override
    public void playerExperienceCounter(Player player) {
//TODO lehet ezt külön methodokba kellene attackresult/death/mm/stb-re
    }

    //experience from getting wounded
    @Override
    public void experienceCounterHPLoss(Integer hpLoss) {
        java.util.List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.size() < 2) return;
        Player defender = pair.get(1);
        defender.setXp(defender.getXp() + hpLoss);
        refreshAdventurerOrderedListObject(defender);
    }

    //experience from giving or getting crit blow
    @Override
    public void experienceCounterCrit(String crit) {
        java.util.List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.size() < 2) return;
        Player attacker = pair.get(0);
        Player defender = pair.get(1);
        Double defenderLvl = Double.valueOf(defender.getLvl());


        if (crit.equals("X")) {
            experienceModifiers.setCritMultiplyer(0D);
        } else if (crit.equals("T")) {
            experienceModifiers.setCritMultiplyer(0D);
        } else if (crit.equals("A")) {
            experienceModifiers.setCritMultiplyer(5D);
        } else if (crit.equals("B")) {
            experienceModifiers.setCritMultiplyer(10D);
        } else if (crit.equals("C")) {
            experienceModifiers.setCritMultiplyer(15D);
        } else if (crit.equals("D")) {
            experienceModifiers.setCritMultiplyer(20D);
        } else if (crit.equals("E")) {
            experienceModifiers.setCritMultiplyer(25D);
        }

        if (!defender.getIsAlive()) {
            experienceModifiers.setCritModifier(0D);
        } else if (healthPercent(defender) < 15) {
            experienceModifiers.setCritModifier(0.1);
        } else if (defender.getIsStunned()) {
            experienceModifiers.setCritModifier(0.5);
        } else if (isPlayerFightAlone()) {
            experienceModifiers.setCritModifier(2D);
        } else  experienceModifiers.setCritModifier(1D);

        Double experienceAttacker = defenderLvl * experienceModifiers.getCritMultiplyer() * experienceModifiers.getCritModifier();
        attacker.setXp(attacker.getXp() + experienceAttacker);
        refreshAdventurerOrderedListObject(attacker);

        Double experienceDefender = 20 * experienceModifiers.getCritMultiplyer();
        defender.setXp(defender.getXp() + experienceDefender);
        refreshAdventurerOrderedListObject(defender);
    }

    @Override
    public void experienceCounterKill() {
        java.util.List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.size() < 2) return;
        Player attacker = pair.get(0);
        Player defender = pair.get(1);
        Double experienceKill = 0D;

        if ((!defender.getIsAlive()) && (experienceModifiers.getIsTargetAlive())) {
            if(attacker.getLvl().equals(defender.getLvl())) {
                experienceKill = 200D;
            }
            if(attacker.getLvl() < defender.getLvl()) {
                experienceKill = 200D + (defender.getLvl() - attacker.getLvl()) * 50;
            }
            if(attacker.getLvl() > defender.getLvl()) {
                experienceKill = 200D - (attacker.getLvl() - defender.getLvl()) * 25;
            }
        }

        if (experienceKill < 0) {
            experienceKill = 0D;
        }
        attacker.setXp(attacker.getXp() + experienceKill);
        refreshAdventurerOrderedListObject(attacker);

    }

    @Override
    public void experienceCounterManeuver() {
        //TODO implement method
    }

    @Override
    public void experienceCounterMagic() {
        java.util.List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.isEmpty()) return;
        Player attacker = pair.get(0);
        int magicLvl = 1; //TODO ivenni a magiclevlelt valahonnan, és a methodot magát betenni a helyére, hogy számolja az XP-t
        Double experienceMagic = 0D;

        if (attacker.getLvl() <= magicLvl) {
            experienceMagic = 100D;
        } else {
            experienceMagic = Double.valueOf(100 - ((attacker.getLvl() - magicLvl) * 10));
        }

        if (experienceMagic < 0) {
            experienceMagic = 0D;
        }

        attacker.setXp(attacker.getXp() + experienceMagic);
        refreshAdventurerOrderedListObject(attacker);

    }

    @Override
    public Boolean isPlayerFightAlone() {
        java.util.List<Player> pair = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight();
        if (pair == null || pair.isEmpty()) return true;
        Player attacker = pair.get(0);
        int count = 0;
        java.util.List<Player> ord = adventurerOrderedListObject.getPlayerList();
        if (ord == null) return true;
        for (Player player: ord) {
            if (player.getTarget() == attacker.getTarget()) {
                count += 1;
            }
        }
        return count == 1;
    }
}
