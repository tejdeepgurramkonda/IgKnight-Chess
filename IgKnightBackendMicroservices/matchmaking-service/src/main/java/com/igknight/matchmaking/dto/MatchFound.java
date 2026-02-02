package com.igknight.matchmaking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing a successful match between two players
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchFound {
    private Long gameId;
    private String opponentId;
    private String timeControl;

    // Constructor for backward compatibility
    public MatchFound(String player1Id, String player2Id, String timeControl) {
        this.opponentId = player2Id;
        this.timeControl = timeControl;
    }
}
