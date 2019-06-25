package com.sol.merp.controllers;

import com.sol.merp.characters.Player;
import com.sol.merp.characters.PlayerRepository;
import com.sol.merp.characters.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/merp")
public class MerpController {
    private PlayerRepository playerRepository;
    private PlayerService playerService;




    @Autowired
    public MerpController(PlayerRepository playerRepository, PlayerService playerService) {
        this.playerRepository = playerRepository;
        this.playerService = playerService;
    }


    @GetMapping("/allplayers")
    public String playerlist(Model model) {
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
        model.addAttribute("player", playerRepository.findById(id).get());
        return "playeredit";
    }

    @PostMapping("/edit/{id}")
    public String editPlayerSubmit(@ModelAttribute(value = "player") Player player) {
        playerRepository.save(player);
        return "redirect:/merp/allplayers";
    }

    @GetMapping("/delete/{id}")
    public String deletePlayer(@PathVariable Long id) {
        playerRepository.deleteById(id);
        return "redirect:/merp/allplayers";
    }
}