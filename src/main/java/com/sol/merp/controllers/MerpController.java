package com.sol.merp.controllers;

import com.sol.merp.characters.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/merp")
public class MerpController {
    private PlayerRepository playerRepository;

    @Autowired
    public MerpController(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }


    @GetMapping
    public String playerlist(Model model) {
        model.addAttribute("players", playerRepository.findAll());
        return "playerlist";
    }
}
