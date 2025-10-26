package com.sol.merp.characters;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.PlayerTarget;
import com.sol.merp.dto.AttackResultsDTO;
import com.sol.merp.fight.FightCount;
import com.sol.merp.modifiers.AttackModifierService;
import com.sol.merp.modifiers.ExperienceModifiers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

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

    @Override
    public void changeIsPlayStatus(Player player) {
        if (player.getIsPlaying()) {
            player.setIsPlaying(false);
        } else player.setIsPlaying(true);
        playerRepository.save(player);
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
        player.setPenaltyOfActions(0);
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
        Boolean isTargetInOrderedList;

        String targetCharacterId = attacker.getTarget().toString();
        Player target = playerRepository.findByCharacterId(targetCharacterId);

        if (!adventurerOrderedListObject.getPlayerList().contains(target)) {
            attacker.setTarget(PlayerTarget.none);
            attacker.setIsActive(false);
        }
    }

    //picks the next ACTIVE player from ordered list as attacker, and its target, put them into a list and wrap the list into an object
    @Override
    public NextTwoPlayersToFigthObject nextPlayersToFight() throws Exception { //TODO atalakitani hogz nextTwoPlayerObjectet adjon vissza + vegigkovetni a valtozat mashol is
        List<Player> orderedList = adventurerOrderedListObject.getPlayerList();

        fightCount.setFightCountMax(orderedList.size());

        if (fightCount.getFightCount() <= fightCount.getFightCountMax()) {
            Player attacker = orderedList.get(fightCount.getFightCount() - 1);
            while (!attacker.getIsActive()) {
                fightCount.setFightCount(fightCount.getFightCount() + 1);
                if (fightCount.getFightCount() > fightCount.getFightCountMax()) {
                    break;
                }
                attacker = orderedList.get(fightCount.getFightCount() - 1);
            }

            String defenderCharacterId = attacker.getTarget().toString();
            Player defender = playerRepository.findByCharacterId(defenderCharacterId);

            List<Player> nextTwoPLayersToFight = new ArrayList<>();
            nextTwoPLayersToFight.add(attacker);
            nextTwoPLayersToFight.add(defender);

            nextTwoPlayersToFigthObject.setNextTwoPlayersToFight(nextTwoPLayersToFight);

            return nextTwoPlayersToFigthObject;
        } else return nextTwoPlayersToFigthObject;
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
            String charId = player.getCharacterId();
            for (int i = 0; i < playerTargetValues.size(); i++) {
                if (playerTargetValues.get(i).toString().equals(charId)) {
                    targetsFromOrderedList.add(playerTargetValues.get(i));
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
        if (!player.getIsAlive()) {
            player.setHpActual(0D);
            player.setIsActive(false);
            player.setIsStunned(false);
            player.setStunnedForRounds(0);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
        }

        if (player.getHpActual() <= 0) {
            player.setHpActual(0D);
            player.setIsAlive(false);
            player.setIsActive(false);
            player.setIsStunned(false);
            player.setStunnedForRounds(0);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
        }

        if (player.getStunnedForRounds() <= 0) {
            player.setStunnedForRounds(0);
            player.setIsStunned(false);
        } else {
            player.setIsStunned(true);
            player.setPlayerActivity(PlayerActivity._5DoNothing);
            player.setIsActive(false);
        }

        if ((player.getPlayerActivity().equals(PlayerActivity._4PrepareMagic)) ||
                player.getPlayerActivity().equals(PlayerActivity._5DoNothing)) {
            player.setIsActive(false);
        } else {
            player.setIsActive(true);
        }

        setTbBasedOnAttackType(player);

        if (player.getTbUsedForDefense() > player.getTb() / 2) {
            player.setTbUsedForDefense(player.getTb() / 2);
        }


        playerRepository.save(player);
    }

    @Override
    public void setTbBasedOnAttackType(Player player) {
        if ((player.getAttackType().equals(AttackType.slashing)) ||
                (player.getAttackType().equals(AttackType.blunt)) ||
                (player.getAttackType().equals(AttackType.clawsAndFangs)) ||
                (player.getAttackType().equals(AttackType.grabOrBalance))) {
            player.setTb(player.getTbOneHanded());
        } else if (player.getAttackType().equals(AttackType.twoHanded)) {
            player.setTb(player.getTbTwoHanded());
        } else if (player.getAttackType().equals(AttackType.ranged)) {
            player.setTb(player.getTbRanged());
        } else if (player.getAttackType().equals(AttackType.baseMagic)) {
            player.setTb(player.getTbBaseMagic());
        } else if ((player.getAttackType().equals(AttackType.magicBall)) ||
                (player.getAttackType().equals(AttackType.magicProjectile))) {
            player.setTb(player.getTbTargetMagic());
        } else player.setTb(0);


    }

    //Adds experience points after each and every action
    @Override
    public void playerExperienceCounter(Player player) {
//TODO lehet ezt külön methodokba kellene attackresult/death/mm/stb-re
    }

    //experience from getting wounded
    @Override
    public void experienceCounterHPLoss(Integer hpLoss) {
        Player defender = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1);
        defender.setXp(defender.getXp() + hpLoss);
        refreshAdventurerOrderedListObject(defender);
    }

    //experience from giving or getting crit blow
    @Override
    public void experienceCounterCrit(String crit) {
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        Player defender = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1);
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
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        Player defender = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1);
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
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
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
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        int count = 0;
        for (Player player: adventurerOrderedListObject.getPlayerList()) {
            if (player.getTarget() == attacker.getTarget()) {
                count += 1;
            }
        }
        return count == 1;
    }
}
