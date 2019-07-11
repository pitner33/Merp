package com.sol.merp.controllers;

import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import com.sol.merp.googlesheetloader.SheetReader;
import com.sol.merp.modifiers.AttackModifier;
import com.sol.merp.modifiers.AttackModifierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@Controller
@RequestMapping("/merp")
public class MerpController {
    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private PlayerService playerService;
    @Autowired
    private AttackModifierRepository attackModifierRepository;
    @Autowired
    private SheetReader sheetReader; //TODO csak azert benne hogy mukodik-e - kivenni





//    public MerpController(PlayerRepository playerRepository, PlayerService playerService, AttackModifier attackModifier) {
//        this.playerRepository = playerRepository;
//        this.playerService = playerService;
//        this.attackModifier = attackModifier;
//    }


    @GetMapping("/allplayers")
    public String playerlist(Model model) {
        System.out.println(sheetReader.mapSlashing.get(149).toString()); //TODO csak azert benne hogy mukodik-e - kivenni
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
        return "adventureMain";
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
}