package com.igknight.game.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class GameResponse {
    private Long id;
    private PlayerInfo whitePlayer;
    private PlayerInfo blackPlayer;
    private String fenPosition;
    private String currentTurn;
    private String status;
    private Long winnerId;
    private Integer whiteTimeRemaining;
    private Integer blackTimeRemaining;
    private Integer timeControl;
    private Integer timeIncrement;
    private Boolean isRated;
    private Boolean isCheck;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime endedAt;
    private List<MoveInfo> moves;

    @Data
    public static class PlayerInfo {
        private Long id;
        private String username;

        public PlayerInfo(Long id, String username) {
            this.id = id;
            this.username = username;
        }
    }

    @Data
    public static class MoveInfo {
        private Integer moveNumber;
        private String from;
        private String to;
        private String piece;
        private String san;
        private String resultingFen;
        private Boolean isCapture;
        private Boolean isCheck;
        private Boolean isCheckmate;
    }
}
