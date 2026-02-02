package com.igknight.matchmaking.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO from Game Service (simplified)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GameServiceResponse {
    private Long id;  // Game ID (game-service returns "id", not "gameId")
    private Long gameId;  // Kept for backward compatibility
    private Long whitePlayerId;
    private String whitePlayerUsername;
    private Long blackPlayerId;
    private String blackPlayerUsername;
    private String status;
    private Integer timeControl;
    private Integer timeIncrement;
    private Boolean isRated;
    
    // Getter that returns id if gameId is null (game-service returns "id")
    public Long getGameId() {
        return gameId != null ? gameId : id;
    }
}
