package com.igknight.realtime.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for GAME_STATE message sent to newly connected client
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameStateMessage {
    private String fen;
    private String currentTurn;
    private String status;
    private LastMoveInfo lastMove;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LastMoveInfo {
        private String from;
        private String to;
        private String piece;
        private String san;
        private Boolean isCapture;
        private Boolean isCheck;
        private Boolean isCheckmate;
    }
}
