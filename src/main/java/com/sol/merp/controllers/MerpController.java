package com.sol.merp.controllers;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.PlayerTarget;
import com.sol.merp.characters.*;
import com.sol.merp.dto.AttackResultsDTO;
import com.sol.merp.fight.FightCount;
import com.sol.merp.fight.FightService;
import com.sol.merp.fight.Round;
import com.sol.merp.googlesheetloader.MapsFromTabs;
import com.sol.merp.modifiers.AttackModifier;
//import com.sol.merp.modifiers.AttackModifierRepository;
import com.sol.merp.modifiers.AttackModifierService;
import com.sol.merp.modifiers.ExperienceModifiers;
import jdk.nashorn.internal.objects.annotations.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/merp")
public class MerpController {
    private Logger logger = LoggerFactory.getLogger(this.getClass());

    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private PlayerService playerService;
    @Autowired
    AttackModifier attackModifier;
    @Autowired
    AttackModifierService attackModifierService;
    @Autowired
    private MapsFromTabs mapsFromTabs; //TODO csak azert benne hogy mukodik-e - kivenni
    @Autowired
    FightService fightService;
    @Autowired
    Round round;
    @Autowired
    FightCount fightCount;
    @Autowired
    PlayerListObject adventurerOrderedListObject;
    @Autowired
    NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject;
    @Autowired
    ExperienceModifiers experienceModifiers;


    @GetMapping("/allplayers")  //TODO allplayers only for players, separate page for NPCs
    public String playerlist(Model model) {
        System.out.println(mapsFromTabs.getMapSlashing().get(149).toString()); //TODO csak azert benne hogy mukodik-e - kivenni
        playerService.playerActivitySwitch();
        playerService.doNothingWhenStunned();
        model.addAttribute("players", playerRepository.findAll());
        return "playerlist";
    }

    @GetMapping("/edit_isplay/{id}")
    public String editIsPlay(@PathVariable Long id) {
        Player player = playerRepository.findById(id).get();
        playerService.changeIsPlayStatus(player);
        return "redirect:/merp/allplayers";
    }

    @GetMapping("/revive/{id}")
    public String revivePlayer(@PathVariable Long id) {
        Player player = playerRepository.findById(id).get();
        playerService.revivePlayer(player);
        return "redirect:/merp/allplayers";
    }

    @GetMapping("/edit/{id}")
    public String editPlayer(@PathVariable Long id, Model model) {
        playerService.playerActivitySwitch();
        playerService.doNothingWhenStunned();
        model.addAttribute("player", playerRepository.findById(id).get());
        return "playeredit";
    }

    @PostMapping("/edit/{id}")
    public String editPlayerSubmit(@ModelAttribute(value = "player") Player player) {
//        playerService.playerActivitySwitch(player);
        playerRepository.save(player);
        return "redirect:/merp/allplayers";
    }

    @GetMapping("/delete/{id}")
    public String deletePlayer(@PathVariable Long id) {
        playerRepository.deleteById(id);
        return "redirect:/merp/allplayers";
    }

    @GetMapping("/adventure")
    public String adventureMain(Model model) {
        round.setRoundCount(0);
        model.addAttribute("adventurers", playerRepository.findAllByIsPlayingIsTrue());
        return "adventureMain";
    }

    @PostMapping("/adventure")
    public String adventureMainPost(@ModelAttribute(value = "adventurers") List<Player> allWhoPlays) {
        for (Player player : allWhoPlays) {
            playerRepository.save(player);
        }
        return "redirect:/merp/adventure";
    }

    @GetMapping("/adventure/round")
    public String round(Model modelOrderedList,
                        Model modelModifiers,
                        Model modelRoundCount,
                        Model modelPlayerActivity,
                        Model modelAttackType,
                        Model modelCritType,
                        Model modelPlayerTarget,
                        Model modelStunnedPlayers,
                        Model modelDeadPlayers) {

        modelRoundCount.addAttribute("modelRoundCount", round.getRoundCount());
        modelModifiers.addAttribute("modelModifiers", attackModifier);
        modelOrderedList.addAttribute("modelOrderedList", adventurerOrderedListObject);
        modelPlayerActivity.addAttribute("modelPlayerActivity", PlayerActivity.values());
        modelAttackType.addAttribute("modelAttackType", AttackType.values());
        modelCritType.addAttribute("modelCritType", CritType.values());
        modelPlayerTarget.addAttribute("modelPlayerTarget", PlayerTarget.values());
        modelStunnedPlayers.addAttribute("modelStunnedPlayers", playerService.stunnedPlayers());
        modelDeadPlayers.addAttribute("modelDeadPlayers", playerService.deadPlayers());



        return "adventureRound";
    }

    @PostMapping("/adventure/round")
    public String roundPost(@ModelAttribute(value = "modelOrderedList") PlayerListObject playerListObject) {
        playerListObject.getPlayerList().forEach(player -> {
            playerService.checkAndSetStats(player); //TODO is it used? If so, than change to adventurerOrderedObjectRefresh
            playerRepository.save(player);
        });
        return "redirect:/merp/adventure/round";
    }

    @GetMapping("/adventure/startfight")
    public String startfight() {
        adventurerOrderedListObject.getPlayerList().forEach(player -> playerService.refreshAdventurerOrderedListObject(player));;
        fightCount.setFightCount(fightCount.getFightCount() + 1);
        playerService.nextPlayersToFight();
        attackModifierService.resetAttackmodifier();
        return "redirect:/merp/adventure/prefight";
    }

    @GetMapping("/adventure/prefight")
    public String preFight(Model modelNextTwoPlayers,
                           Model modelAttackModifier,
                           Model modelFightCount,
                           Model modelPlayerActivity,
                           Model modelAttackType,
                           Model modelCritType,
                           Model modelPlayerTarget,
                           Model modelHealthPercent) {
//        fightCount.setFightCount(fightCount.getFightCount() + 1);
//        NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject = playerService.nextPlayersToFight();

        experienceModifiers.setIsTargetAlive(nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1).getIsAlive());

        modelNextTwoPlayers.addAttribute("players", nextTwoPlayersToFigthObject);
        modelAttackModifier.addAttribute("attackmodifier", attackModifier);
        modelFightCount.addAttribute("counter", fightCount);
        modelPlayerActivity.addAttribute("modelPlayerActivity", PlayerActivity.values());
        modelAttackType.addAttribute("modelAttackType", AttackType.values());
        modelCritType.addAttribute("modelCritType", CritType.values());
        modelPlayerTarget.addAttribute("modelPlayerTarget", PlayerTarget.values());
        //TODO outofbound a vegen
//        modelHealthPercent.addAttribute("modelHealthPercent", playerService.healthPercent(playersFight.get(1)));

        if (fightCount.getFightCount() > fightCount.getFightCountMax()) {
            return "redirect:/merp/adventure/nextround";
        } else {
            return "adventurePreFight";
        }
    }

    @PostMapping("/adventure/prefight/saveplayer")
    public String prefightPost(@ModelAttribute(value = "players") NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject) {
//        fightCount.setFightCount(fightCount.getFightCount() - 1); //necessary for not change fightcount when reload page
        nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().forEach(player -> {

            //here refreshing ordered list, KEEP the order, checkAndSetStat, also save in repo
            playerService.refreshAdventurerOrderedListObject(player);
            //TODO for targetchange decrease TB to half (check the rules)
        });
        playerService.nextPlayersToFight();
        return "redirect:/merp/adventure/prefight";
    }

    @PostMapping("/adventure/prefight/savemodifier")
    public String prefightPost(@ModelAttribute(value = "attackmodifier") AttackModifier modified) {
//        fightCount.setFightCount(fightCount.getFightCount() - 1); //necessary for not change fightcount when reload page

        attackModifierService.setAttackModifierFromPostMethod(modified);
//        attackModifierService.countAttackModifier();

        logger.info("ATTACKMODIFIER STUN {} ", attackModifier.getDefenderStunned().toString());
        logger.info("ATTACKMODIFIER SUPR {} ", attackModifier.getDefenderSurprised().toString());
        logger.info("ATTACKMODIFIER 50% {} ", attackModifier.getAttackerHPBelow50Percent().toString());
        logger.info("ATTACKMODIFIER Behind {} ", attackModifier.getAttackFromBehind().toString());
        return "redirect:/merp/adventure/prefight";
    }

    @GetMapping("/adventure/fight")
    public String fight(Model modelNextTwoPlayers,
                        Model modelResultDTO,
                        Model modelAttackModifier,
                        Model modelAttackModifierResult,
                        Model modelFightCount,
                        Model modelPlayerActivity,
                        Model modelAttackType,
                        Model modelCritType,
                        Model modelPlayerTarget) {

        Player attacker = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(0);
        Player defender = nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().get(1);

//        attackModifierService.setAttackModifierOnlyPlayerDependent();

        AttackResultsDTO attackResultsDTO = fightService.attackOtherThanBaseMagicOrMagicBall(attacker, defender);

        modelNextTwoPlayers.addAttribute("players", nextTwoPlayersToFigthObject);
        modelResultDTO.addAttribute("resultDTO", attackResultsDTO);
        modelAttackModifier.addAttribute("attackmodifier", attackModifier);
        modelAttackModifier.addAttribute("modelAttackModifierResult", attackModifierService.countAttackModifier());
        modelFightCount.addAttribute("counter", fightCount);
        modelPlayerActivity.addAttribute("modelPlayerActivity", PlayerActivity.values());
        modelAttackType.addAttribute("modelAttackType", AttackType.values());
        modelCritType.addAttribute("modelCritType", CritType.values());
        modelPlayerTarget.addAttribute("modelPlayerTarget", PlayerTarget.values());

        return "adventureFight";
    }

    @PostMapping("/adventure/fight")
    public String fightPost(@ModelAttribute(value = "players") NextTwoPlayersToFigthObject nextTwoPlayersToFigthObject) {
        nextTwoPlayersToFigthObject.getNextTwoPlayersToFight().forEach(player -> {
            playerService.refreshAdventurerOrderedListObject(player);
        });
        return "redirect:/merp/adventure/fight"; // this way the attack will be duplicated upon save --> Save button DISABLED!!!
    }


    @GetMapping("/adventure/nextfight")
    public String nextFight() {
        adventurerOrderedListObject.getPlayerList().forEach(player -> playerService.refreshAdventurerOrderedListObject(player));;
        fightCount.setFightCount(fightCount.getFightCount() + 1);
        playerService.nextPlayersToFight();
        attackModifierService.resetAttackmodifier();
        return "redirect:/merp/adventure/prefight";
    }

    @GetMapping("/adventure/nextround")
    public String nextRound() {
        fightCount.setFightCount(0); //fightcount set to -1 (when loading prefight it will be 0), prepare for next round
        round.setRoundCount(round.getRoundCount() + 1);

        playerService.adventurersOrderedList();

        fightService.decreaseStunnedForRoundCounter();

        adventurerOrderedListObject.getPlayerList().forEach(player -> {
            playerService.checkAndSetStats(player);
        });

        return "redirect:/merp/adventure/round";
    }
}