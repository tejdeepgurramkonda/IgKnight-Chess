package com.igknight.game.dto;

import lombok.Data;

@Data
public class CreateGameRequest {
    private Integer timeControl;
    private Integer timeIncrement;
    private Boolean isRated;
}
