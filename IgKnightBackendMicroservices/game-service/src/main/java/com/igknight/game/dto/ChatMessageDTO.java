package com.igknight.game.dto;

import java.time.LocalDateTime;

public class ChatMessageDTO {
    private Long id;
    private Long gameId;
    private Long userId;
    private String username;
    private String message;
    private LocalDateTime timestamp;

    // Constructors
    public ChatMessageDTO() {
    }

    public ChatMessageDTO(Long id, Long gameId, Long userId, String username, String message, LocalDateTime timestamp) {
        this.id = id;
        this.gameId = gameId;
        this.userId = userId;
        this.username = username;
        this.message = message;
        this.timestamp = timestamp;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getGameId() {
        return gameId;
    }

    public void setGameId(Long gameId) {
        this.gameId = gameId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
