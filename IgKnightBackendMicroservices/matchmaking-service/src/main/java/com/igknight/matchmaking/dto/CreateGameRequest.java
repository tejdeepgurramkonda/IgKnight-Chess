package com.igknight.matchmaking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a game in Game Service
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateGameRequest {

    private Long whitePlayerId;
    private Long blackPlayerId;

    // seconds
    private Integer timeControl;

    // seconds per move
    private Integer timeIncrement;

    private Boolean isRated;
}


