package com.sol.merp.mm;

import com.sol.merp.mm.dto.MMFailResponse;
import com.sol.merp.mm.dto.MMResolveResponse;

public interface MMService {
    MMResolveResponse resolve(String mmType, String maneuverType, String difficulty, int modifiedRoll);
    MMFailResponse getFailText(int failRoll);
    MMFailResponse applyFail(Long playerId, int failRoll);
}
