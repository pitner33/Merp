package com.sol.merp.characters;

import org.springframework.stereotype.Service;

@Service
public interface PlayerService {
    void changeIsPlayStatus(Player player);
}

//TODO bandage method a HP/round nullazasra