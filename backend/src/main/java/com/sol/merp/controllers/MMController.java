package com.sol.merp.controllers;

import com.sol.merp.mm.MMService;
import com.sol.merp.mm.dto.MMFailResponse;
import com.sol.merp.mm.dto.MMResolveResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mm")
public class MMController {

    @Autowired
    private MMService mmService;

    @GetMapping("/resolve")
    public MMResolveResponse resolve(
            @RequestParam("mmType") String mmType,
            @RequestParam(value = "maneuverType", required = false) String maneuverType,
            @RequestParam(value = "difficulty", required = false) String difficulty,
            @RequestParam("modifiedRoll") int modifiedRoll
    ) {
        return mmService.resolve(mmType, maneuverType, difficulty, modifiedRoll);
    }

    @GetMapping("/fail-text")
    public MMFailResponse getFailText(@RequestParam("failRoll") int failRoll) {
        return mmService.getFailText(failRoll);
    }

    @PostMapping("/apply-fail")
    public MMFailResponse applyFail(
            @RequestParam("playerId") Long playerId,
            @RequestParam("failRoll") int failRoll
    ) {
        return mmService.applyFail(playerId, failRoll);
    }
}
