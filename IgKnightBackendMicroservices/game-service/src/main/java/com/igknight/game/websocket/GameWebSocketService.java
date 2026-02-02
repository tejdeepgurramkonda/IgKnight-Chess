package com.igknight.game.websocket;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class GameWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public GameWebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyGameUpdate(Long gameId, Object gameState) {
        String destination = "/topic/game/" + gameId;
        messagingTemplate.convertAndSend(destination, gameState);
    }

    public void notifyPlayerMove(Long gameId, Object moveData) {
        String destination = "/topic/game/" + gameId + "/move";
        messagingTemplate.convertAndSend(destination, moveData);
    }

    public void notifyGameStart(Long gameId, Object gameData) {
        String destination = "/topic/game/" + gameId + "/start";
        messagingTemplate.convertAndSend(destination, gameData);
    }

    public void notifyGameEnd(Long gameId, Object endData) {
        String destination = "/topic/game/" + gameId + "/end";
        messagingTemplate.convertAndSend(destination, endData);
    }

    public void notifyPlayerJoined(Long gameId, Object playerData) {
        String destination = "/topic/game/" + gameId + "/player-joined";
        messagingTemplate.convertAndSend(destination, playerData);
    }

    public void notifyChatMessage(Long gameId, Object chatMessage) {
        String destination = "/topic/game/" + gameId + "/chat";
        messagingTemplate.convertAndSend(destination, chatMessage);
    }

    public void sendToUser(String username, String destination, Object payload) {
        messagingTemplate.convertAndSendToUser(username, destination, payload);
    }
}
