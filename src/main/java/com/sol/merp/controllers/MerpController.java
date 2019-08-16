package com.sol.merp.controllers;

import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import com.sol.merp.dto.AttackResultsDTO;
import com.sol.merp.fight.FightService;
import com.sol.merp.googlesheetloader.MapsFromTabs;
import com.sol.merp.modifiers.AttackModifier;
import com.sol.merp.modifiers.AttackModifierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

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





//    public MerpController(PlayerRepository playerRepository, PlayerService playerService, AttackModifier attackModifier) {
//        this.playerRepository = playerRepository;
//        this.playerService = playerService;
//        this.attackModifier = attackModifier;
//    }


    @GetMapping("/allplayers")
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
        model.addAttribute("adventurers", playerService.adventurersOrderedList());
        return "adventureMain";
    }

    @PostMapping("/adventure")
    public String adventureMainPost(@ModelAttribute(value="adventurers") List<Player> allWhoPlays) {
        for (Player player:allWhoPlays) {
            playerRepository.save(player);
        }
        return "redirect:/adventure";
    }

    @GetMapping("/adventure/round")
    public String round(Model model) {
        model.addAttribute("attackmodifier", attackModifierRepository.findById(13L).get());
        return  "adventureRound";
    }

    @PostMapping("/adventure/round")
    public String roundPost(@ModelAttribute(value = "attackmodifier") AttackModifier attackModifier) {
        attackModifierRepository.save(attackModifier);
        System.out.println(attackModifier.getAttackerHPBelow50Percent());
        System.out.println(attackModifier.getAttackFromBehind());
        System.out.println(attackModifier.getDefenderStunned());

        System.out.println(attackModifier.countAttackModifier());
        return "adventureMain";
    }

    @GetMapping("/adventure/fight")
    public String fight(Model model, Model model2) {
        List<Player> playersFight = new ArrayList<>();
        Player attacker = playerRepository.findById(1L).get();
        Player defender = playerRepository.findById(7L).get();
        playersFight.add(attacker);
        playersFight.add(defender);

        AttackResultsDTO attackResultsDTO = fightService.attackOtherThanBaseMagicOrMagicBall(attacker,defender);

        model.addAttribute("players", playersFight);
        model2.addAttribute("resultDTO", attackResultsDTO);

        return "adventureFight";
    }
}