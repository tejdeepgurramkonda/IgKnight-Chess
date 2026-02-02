package com.igknight.game.websocket;

import java.util.Map;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.igknight.game.dto.ChatMessageDTO;
import com.igknight.game.dto.GameResponse;
import com.igknight.game.dto.MakeMoveRequest;
import com.igknight.game.service.ChatService;
import com.igknight.game.service.GameService;

@Controller
public class GameWebSocketController {

    private final GameService gameService;
    private final GameWebSocketService webSocketService;
    private final ChatService chatService;

    public GameWebSocketController(GameService gameService,
                                  GameWebSocketService webSocketService,
                                  ChatService chatService) {
        this.gameService = gameService;
        this.webSocketService = webSocketService;
        this.chatService = chatService;
    }

    @MessageMapping("/game/{gameId}/move")
    public void handleMove(@DestinationVariable Long gameId,
                          @Payload MakeMoveRequest moveRequest,
                          SimpMessageHeaderAccessor headerAccessor) {
        try {
            Long userId = extractUserId(headerAccessor);

            GameResponse game = gameService.makeMove(gameId, userId, moveRequest);
            
            // Broadcast move to all players watching this game
            webSocketService.notifyGameUpdate(gameId, game);
            
            Map<String, Object> moveData = Map.of(
                "from", moveRequest.getFrom(),
                "to", moveRequest.getTo(),
                "promotion", moveRequest.getPromotion() != null ? moveRequest.getPromotion() : "",
                "fen", game.getFenPosition(),
                "status", game.getStatus(),
                "isCheck", game.getIsCheck()
            );
            webSocketService.notifyPlayerMove(gameId, moveData);
            
            // Check if game ended
            if (game.getStatus() != null && !game.getStatus().equals("IN_PROGRESS")) {
                Map<String, Object> endData = Map.of(
                    "status", game.getStatus(),
                    "winnerId", game.getWinnerId() != null ? game.getWinnerId() : ""
                );
                webSocketService.notifyGameEnd(gameId, endData);
            }
        } catch (Exception e) {
            // Handle errors - could send error message back to user
        }
    }

    @MessageMapping("/game/{gameId}/join")
    public void handleJoinGame(@DestinationVariable Long gameId,
                              SimpMessageHeaderAccessor headerAccessor) {
        try {
            Long userId = extractUserId(headerAccessor);
            String username = resolveUsername(headerAccessor);
            GameResponse game = gameService.joinGame(gameId, userId, username);

            webSocketService.notifyGameUpdate(gameId, game);
            
            Map<String, Object> playerData = Map.of(
                "gameId", gameId,
                "blackPlayer", game.getBlackPlayer()
            );
            webSocketService.notifyPlayerJoined(gameId, playerData);
            
            Map<String, Object> startData = Map.of(
                "gameId", gameId,
                "status", "IN_PROGRESS"
            );
            webSocketService.notifyGameStart(gameId, startData);
        } catch (Exception e) {
            // Handle errors
        }
    }

    @MessageMapping("/game/{gameId}/resign")
    public void handleResign(@DestinationVariable Long gameId,
                            SimpMessageHeaderAccessor headerAccessor) {
        try {
            Long userId = extractUserId(headerAccessor);
            GameResponse game = gameService.resignGame(gameId, userId);
            
            webSocketService.notifyGameUpdate(gameId, game);
            
            Map<String, Object> endData = Map.of(
                "status", "RESIGNATION",
                "winnerId", game.getWinnerId() != null ? game.getWinnerId() : "",
                "resignedUserId", userId
            );
            webSocketService.notifyGameEnd(gameId, endData);
        } catch (Exception e) {
            // Handle errors
        }
    }

    @MessageMapping("/game/{gameId}/chat")
    public void handleChat(@DestinationVariable Long gameId,
                           @Payload Map<String, String> payload,
                           SimpMessageHeaderAccessor headerAccessor) {
        try {
            Long userId = extractUserId(headerAccessor);
            String username = resolveUsername(headerAccessor);
            String message = payload != null ? payload.getOrDefault("message", "") : "";
            if (message == null || message.trim().isEmpty()) {
                return;
            }

            // Save message to database
            ChatMessageDTO savedMessage = chatService.saveMessage(gameId, userId, username, message.trim());

            // Broadcast to all clients
            Map<String, Object> chatMessage = Map.of(
                "id", savedMessage.getId(),
                "userId", savedMessage.getUserId(),
                "username", savedMessage.getUsername(),
                "message", savedMessage.getMessage(),
                "timestamp", savedMessage.getTimestamp().toString()
            );

            webSocketService.notifyChatMessage(gameId, chatMessage);
        } catch (Exception e) {
            // Log error but don't crash chat functionality
            System.err.println("Error handling chat message: " + e.getMessage());
        }
    }

    private String resolveUsername(SimpMessageHeaderAccessor headerAccessor) {
        // First, try to get username from session attributes (stored during CONNECT)
        Object usernameAttr = headerAccessor.getSessionAttributes().get("username");
        if (usernameAttr != null) {
            return usernameAttr.toString();
        }

        // Fallback: Extract username from X-Username header (for initial CONNECT)
        String username = headerAccessor.getFirstNativeHeader("X-Username");
        if (username != null && !username.isEmpty()) {
            return username;
        }

        // Fallback to user principal name if available
        if (headerAccessor.getUser() != null) {
            String principalName = headerAccessor.getUser().getName();
            // Principal name is user ID, create default username
            return "user-" + principalName;
        }

        return "Anonymous";
    }

    private Long extractUserId(SimpMessageHeaderAccessor headerAccessor) {
        // Extract user ID from X-User-Id header
        String userIdHeader = headerAccessor.getFirstNativeHeader("X-User-Id");
        if (userIdHeader != null && !userIdHeader.isEmpty()) {
            try {
                return Long.parseLong(userIdHeader);
            } catch (NumberFormatException e) {
                // Invalid format
            }
        }

        // Fallback: extract from Principal if available (set by WebSocketConfig)
        if (headerAccessor.getUser() != null) {
            try {
                return Long.parseLong(headerAccessor.getUser().getName());
            } catch (NumberFormatException e) {
                // Invalid format
            }
        }

        throw new RuntimeException("User not authenticated");
    }
}
