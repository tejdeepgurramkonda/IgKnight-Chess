package com.igknight.realtime.dto;

import lombok.Data;

/**
 * DTO to send move request to Game Service
 */
@Data
public class GameServiceMoveRequest {
    private String from;
    private String to;
    private String promotion;
}
