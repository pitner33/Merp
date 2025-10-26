package com.sol.merp.modifiers;

import com.sol.merp.attributes.DistanceOfAttack;
import com.sol.merp.characters.Player;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class RangedMagicModifier {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @OneToOne
    @JoinColumn(name = "player_id", unique = true)
    private Player player;

    @Enumerated(EnumType.STRING)
    private DistanceOfAttack distanceOfAttack;

    private Integer prepareRounds; // 0..4
    private Integer coverPenalty; // may be null
    private Boolean shieldInLoS;
    private Boolean inMiddleOfMagicBall;
    private Boolean targetAware;
    private Boolean targetNotMoving;

    // Base mage type: Kapcsolat -> true (apply -10), Lenyeg -> false (0)
    private Boolean baseMageTypeKapcsolat;

    private Boolean mdBonus;
    private Boolean agreeingTarget;

    private Integer gmModifier;
}
