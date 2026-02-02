package com.igknight.realtime.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for MOVE_RESULT message to broadcast after successful move
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveResultMessage {
    private String from;
    private String to;
    private String fen;
    private String nextTurn;
    private String piece;
    private String san;
    private Boolean isCapture;
    private Boolean isCheck;
    private Boolean isCheckmate;
}
