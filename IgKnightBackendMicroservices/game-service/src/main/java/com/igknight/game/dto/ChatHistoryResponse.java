package com.igknight.game.dto;

import java.util.List;

public class ChatHistoryResponse {
    private Long gameId;
    private List<ChatMessageDTO> messages;
    private Integer totalMessages;

    // Constructors
    public ChatHistoryResponse() {
    }

    public ChatHistoryResponse(Long gameId, List<ChatMessageDTO> messages) {
        this.gameId = gameId;
        this.messages = messages;
        this.totalMessages = messages != null ? messages.size() : 0;
    }

    // Getters and Setters
    public Long getGameId() {
        return gameId;
    }

    public void setGameId(Long gameId) {
        this.gameId = gameId;
    }

    public List<ChatMessageDTO> getMessages() {
        return messages;
    }

    public void setMessages(List<ChatMessageDTO> messages) {
        this.messages = messages;
        this.totalMessages = messages != null ? messages.size() : 0;
    }

    public Integer getTotalMessages() {
        return totalMessages;
    }

    public void setTotalMessages(Integer totalMessages) {
        this.totalMessages = totalMessages;
    }
}
