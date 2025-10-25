package com.sol.merp.modifiers;

import com.sol.merp.characters.NextTwoPlayersToFigthObject;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AttackModifierServiceImpl implements AttackModifierService {
    @Autowired
    PlayerService playerService;
    @Autowired
    PlayerRepository playerRepository;
    @Autowired
    AttackModifierRepository attackModifierRepository;
    @Autowired
    NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject;


    //Todo betenni amegfelelő helyre
    @Override
    public Integer countAttackModifier() {
        Integer attackModifierNum = 0;
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        AttackModifier attackModifier = getOrCreateFor(attacker);

        if (attackModifier.getAttackFromWeakSide()) {
            attackModifierNum += 15;
        }
        if (attackModifier.getAttackFromBehind()) {
            attackModifierNum += 20;
        }
        if (attackModifier.getDefenderSurprised()) {
            attackModifierNum += 20;
        }
        if (attackModifier.getDefenderStunned()) {
            attackModifierNum += 20;
        }
        if (attackModifier.getAttackerWeaponChange()) {
            attackModifierNum -= 30;
        }
        if (attackModifier.getAttackerHPBelow50Percent()) {
            attackModifierNum -= 20;
        }
        if (attackModifier.getAttackerMoreThan3MetersMovement()) {
            attackModifierNum -= 10;
        }
        if (attackModifier.getAttackerTargetChange()) {
            attacker.setTb(attacker.getTb() / 2);
            playerRepository.save(attacker);
        }

        attackModifierNum += attackModifier.getModifierByGameMaster();

        return attackModifierNum;
    }

    @Override
    public void setAttackModifierFromPostMethod(AttackModifier attackModifierFromPost) {
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        Player defender = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1);
        AttackModifier attackModifier = getOrCreateFor(attacker);

        if (playerService.healthPercent(attacker) < 50) {
            attackModifier.setAttackerHPBelow50Percent(true);
        } else attackModifier.setAttackerHPBelow50Percent(false);

        if (defender.getIsStunned()) {
            attackModifier.setDefenderStunned(true);
        } else attackModifier.setDefenderStunned(false);

        attackModifier.setAttackFromWeakSide(attackModifierFromPost.getAttackFromWeakSide());
        attackModifier.setAttackFromBehind(attackModifierFromPost.getAttackFromBehind());
        attackModifier.setDefenderSurprised(attackModifierFromPost.getDefenderSurprised());
        attackModifier.setAttackerWeaponChange(attackModifierFromPost.getAttackerWeaponChange());
        attackModifier.setAttackerTargetChange(attackModifierFromPost.getAttackerTargetChange());
        attackModifier.setAttackerMoreThan3MetersMovement(attackModifierFromPost.getAttackerMoreThan3MetersMovement());
        attackModifier.setModifierByGameMaster(attackModifierFromPost.getModifierByGameMaster());

        attackModifierRepository.save(attackModifier);
    }

//    @Override
//    public void setAttackModifierOnlyPlayerDependent() {
//        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
//        Player defender = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1);
//
//        if (playerService.healthPercent(attacker) < 50) {
//            attackModifier.setAttackerHPBelow50Percent(true);
//        } else attackModifier.setAttackerHPBelow50Percent(false);
//
//        if (defender.getIsStunned()) {
//            attackModifier.setDefenderStunned(true);
//        } else attackModifier.setDefenderStunned(false);
//    }

    @Override
    public void resetAttackmodifier() {
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        Player defender = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1);
        AttackModifier attackModifier = (attacker != null) ? getOrCreateFor(attacker) : new AttackModifier();

        if (attacker != null) {
            if (playerService.healthPercent(attacker) < 50) {
                attackModifier.setAttackerHPBelow50Percent(true);
            } else attackModifier.setAttackerHPBelow50Percent(false);
        } else attackModifier.setAttackerHPBelow50Percent(false);

        if (defender != null) {
            if (defender.getIsStunned()) {
                attackModifier.setDefenderStunned(true);
            } else attackModifier.setDefenderStunned(false);
        } else attackModifier.setDefenderStunned(false);


        attackModifier.setAttackFromWeakSide(false);
        attackModifier.setAttackFromBehind(false);
        attackModifier.setDefenderSurprised(false);
        attackModifier.setAttackerWeaponChange(false);
        attackModifier.setAttackerTargetChange(false);
        attackModifier.setAttackerMoreThan3MetersMovement(false);
        attackModifier.setModifierByGameMaster(0);
        if (attacker != null) {
            attackModifierRepository.save(attackModifier);
        }
    }

    private AttackModifier getOrCreateFor(Player player) {
        return attackModifierRepository.findByPlayer_Id(player.getId()).orElseGet(() -> {
            AttackModifier am = new AttackModifier();
            am.setPlayer(player);
            am.setAttackFromWeakSide(false);
            am.setAttackFromBehind(false);
            am.setDefenderSurprised(false);
            am.setDefenderStunned(false);
            am.setAttackerWeaponChange(false);
            am.setAttackerTargetChange(false);
            am.setAttackerHPBelow50Percent(false);
            am.setAttackerMoreThan3MetersMovement(false);
            am.setModifierByGameMaster(0);
            return attackModifierRepository.save(am);
        });
    }
}
