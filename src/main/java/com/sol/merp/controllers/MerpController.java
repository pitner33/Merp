package com.sol.merp.controllers;

import com.sol.merp.attributes.AttackType;
import com.sol.merp.attributes.CritType;
import com.sol.merp.attributes.PlayerActivity;
import com.sol.merp.attributes.PlayerTarget;
import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerListObject;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import com.sol.merp.dto.AttackResultsDTO;
import com.sol.merp.fight.FightCount;
import com.sol.merp.fight.FightService;
import com.sol.merp.fight.Round;
import com.sol.merp.googlesheetloader.MapsFromTabs;
import com.sol.merp.modifiers.AttackModifier;
import com.sol.merp.modifiers.AttackModifierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import javax.jws.WebParam;
import java.util.ArrayList;
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
    private AttackModifierRepository attackModifierRepository;
    @Autowired
    private MapsFromTabs mapsFromTabs; //TODO csak azert benne hogy mukodik-e - kivenni
    @Autowired
    FightService fightService;
    @Autowired
    Round round;
    @Autowired
    FightCount fightCount;





//    public MerpController(PlayerRepository playerRepository, PlayerService playerService, AttackModifier attackModifier) {
//        this.playerRepository = playerRepository;
//        this.playerService = playerService;
//        this.attackModifier = attackModifier;
//    }


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
    public String adventureMainPost(@ModelAttribute(value="adventurers") List<Player> allWhoPlays) {
        for (Player player:allWhoPlays) {
            playerRepository.save(player);
        }
        return "redirect:/merp/adventure";
    }

    @GetMapping("/adventure/round")
    public String round(Model modelOrderedList, Model modelModifiers, Model modelRoundCount, Model modelPlayerActivity, Model modelAttackType, Model modelCritType, Model modelPlayerTarget) {
        fightCount.setFightCount(0); //fightcount set to -1 (when loading prefight it will be 0), prepare for next round
        round.setRoundCount(round.getRoundCount() + 1);

        PlayerListObject playerListObject = new PlayerListObject();
        playerListObject.setPlayerList(playerService.adventurersOrderedList());

        modelRoundCount.addAttribute("modelRoundCount", round.getRoundCount());
        modelModifiers.addAttribute("modelModifiers", attackModifierRepository.findById(13L).get());
        modelOrderedList.addAttribute("modelOrderedList", playerListObject);
        modelPlayerActivity.addAttribute("modelPlayerActivity", PlayerActivity.values());
        modelAttackType.addAttribute("modelAttackType", AttackType.values());
        modelCritType.addAttribute("modelCritType", CritType.values());
        modelPlayerTarget.addAttribute("modelPlayerTarget", PlayerTarget.values());
        return  "adventureRound";
    }

    @PostMapping("/adventure/round")
    public String roundPost(@ModelAttribute(value = "modelOrderedList") PlayerListObject playerListObject) {
        playerListObject.getPlayerList().forEach(player -> {
            playerRepository.save(player);
        });
        return "redirect:/merp/adventure/round";
    }

    @GetMapping("/adventure/prefight")
    public String preFight(Model model, Model model3, Model m) {
        fightCount.setFightCount(fightCount.getFightCount() + 1);

        List<Player> playersFight = playerService.nextPlayersToFight();

        model.addAttribute("players", playersFight);
        model3.addAttribute("attackmodifier", attackModifierRepository.findById(13L).get());
        m.addAttribute("counter", fightCount);

        if (fightCount.getFightCount() > fightCount.getFightCountMax()) {
            return "redirect:/merp/adventure/round";
        } else {
            return "adventurePreFight";
        }
    }

    @GetMapping("/adventure/fight")
    public String fight(Model model, Model model2, Model model3, Model m) {
        List<Player> playersFight = playerService.nextPlayersToFight();

        Player attacker = playersFight.get(0);
        Player defender = playersFight.get(1);

        AttackResultsDTO attackResultsDTO = fightService.attackOtherThanBaseMagicOrMagicBall(attacker,defender);

        model.addAttribute("players", playersFight);
        model2.addAttribute("resultDTO", attackResultsDTO);
        model3.addAttribute("attackmodifier", attackModifierRepository.findById(13L).get());
        m.addAttribute("counter", fightCount);

        return "adventureFight";
    }

    @GetMapping("/orderedlist")
    public String orderedList(Model model, Model model2) {
        fightCount.setFightCount(fightCount.getFightCount() + 1);
        fightCount.setFightCountMax(3);
        List<Player> orderedList = playerService.adventurersOrderedList();
        model.addAttribute("orderedList", orderedList);
        model2.addAttribute("counter", fightCount);
        if (fightCount.getFightCount().intValue() == fightCount.getFightCountMax().intValue()) {
            return "redirect:/merp/allplayers";
        }
        return "orderedList";
    }

    @GetMapping("/adventure/nextfight")
    public String nextFight() {
        return "redirect:/merp/adventure/prefight";
    }
}