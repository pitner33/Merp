package com.sol.merp.modifiers;

import com.sol.merp.attributes.DistanceOfAttack;
import com.sol.merp.characters.NextTwoPlayersToFigthObject;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RangedMagicModifierServiceImpl implements RangedMagicModifierService {

    @Autowired
    private NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject;

    @Autowired
    private RangedMagicModifierRepository repo;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private RangedAndMagicModifier rangedAndMagicModifier;

    @Override
    public int countRangedMagicModifier() {
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        RangedMagicModifier rm = getOrCreateFor(attacker);

        DistanceOfAttack dist = rm.getDistanceOfAttack();
        Integer rounds = rm.getPrepareRounds();
        Integer cover = rm.getCoverPenalty();
        boolean shieldLos = Boolean.TRUE.equals(rm.getShieldInLoS());
        boolean inMiddle = Boolean.TRUE.equals(rm.getInMiddleOfMagicBall());
        boolean aware = Boolean.TRUE.equals(rm.getTargetAware());
        boolean notMoving = Boolean.TRUE.equals(rm.getTargetNotMoving());
        boolean kapcsolat = Boolean.TRUE.equals(rm.getBaseMageTypeKapcsolat());
        boolean md = Boolean.TRUE.equals(rm.getMdBonus());
        boolean agreeing = Boolean.TRUE.equals(rm.getAgreeingTarget());
        boolean applyPrepare = attacker.getPlayerActivity() != null && attacker.getPlayerActivity().equals(com.sol.merp.attributes.PlayerActivity._1PerformMagic);
        int base = rangedAndMagicModifier.countModifierWithFlags(
                dist, rounds, cover, shieldLos, applyPrepare,
                inMiddle, aware, notMoving, kapcsolat, md, agreeing);
        int gm = rm.getGmModifier() != null ? rm.getGmModifier() : 0;
        return base + gm;
    }

    @Override
    public void setRangedMagicModifierFromPost(RangedMagicModifier incoming) {
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        RangedMagicModifier rm = getOrCreateFor(attacker);

        rm.setDistanceOfAttack(incoming.getDistanceOfAttack());
        rm.setPrepareRounds(incoming.getPrepareRounds());
        rm.setCoverPenalty(incoming.getCoverPenalty());
        rm.setShieldInLoS(incoming.getShieldInLoS());
        rm.setInMiddleOfMagicBall(incoming.getInMiddleOfMagicBall());
        rm.setTargetAware(incoming.getTargetAware());
        rm.setTargetNotMoving(incoming.getTargetNotMoving());
        rm.setBaseMageTypeKapcsolat(incoming.getBaseMageTypeKapcsolat());
        rm.setMdBonus(incoming.getMdBonus());
        rm.setAgreeingTarget(incoming.getAgreeingTarget());
        rm.setGmModifier(incoming.getGmModifier());

        repo.save(rm);
    }

    @Override
    public void resetRangedMagicModifier() {
        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        RangedMagicModifier rm = attacker != null ? getOrCreateFor(attacker) : new RangedMagicModifier();
        rm.setDistanceOfAttack(DistanceOfAttack._3_15m);
        rm.setPrepareRounds(0);
        rm.setCoverPenalty(0);
        rm.setShieldInLoS(false);
        rm.setInMiddleOfMagicBall(false);
        rm.setTargetAware(false);
        rm.setTargetNotMoving(false);
        rm.setBaseMageTypeKapcsolat(false);
        rm.setMdBonus(false);
        rm.setAgreeingTarget(false);
        rm.setGmModifier(0);
        if (attacker != null) {
            repo.save(rm);
        }
    }

    @Override
    public RangedMagicModifier getOrCreateFor(Player player) {
        return repo.findByPlayer_Id(player.getId()).orElseGet(() -> {
            RangedMagicModifier rm = new RangedMagicModifier();
            rm.setPlayer(player);
            rm.setDistanceOfAttack(DistanceOfAttack._3_15m);
            rm.setPrepareRounds(0);
            rm.setCoverPenalty(0);
            rm.setShieldInLoS(false);
            rm.setInMiddleOfMagicBall(false);
            rm.setTargetAware(false);
            rm.setTargetNotMoving(false);
            rm.setBaseMageTypeKapcsolat(false);
            rm.setMdBonus(false);
            rm.setAgreeingTarget(false);
            rm.setGmModifier(0);
            return repo.save(rm);
        });
    }
}
