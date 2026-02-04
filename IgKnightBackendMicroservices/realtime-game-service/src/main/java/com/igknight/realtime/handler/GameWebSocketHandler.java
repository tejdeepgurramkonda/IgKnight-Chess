package com.igknight.realtime.handler;

import java.net.URI;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.igknight.realtime.dto.ClockUpdateMessage;
import com.igknight.realtime.dto.GameServiceMoveRequest;
import com.igknight.realtime.dto.GameServiceResponse;
import com.igknight.realtime.dto.GameStateMessage;
import com.igknight.realtime.dto.MoveMessage;
import com.igknight.realtime.dto.MoveRejectedMessage;
import com.igknight.realtime.dto.MoveResultMessage;
import com.igknight.realtime.dto.TimeoutMessage;
import com.igknight.realtime.dto.WebSocketMessage;
import com.igknight.realtime.model.GameClock;
import com.igknight.realtime.service.ClockService;
import com.igknight.realtime.service.GameRoomService;
import com.igknight.realtime.service.GameServiceClient;

/**
 * WebSocket handler for game-related real-time communication with room support
 */
@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocketHandler.class);

    private final GameRoomService gameRoomService;
    private final GameServiceClient gameServiceClient;
    private final ClockService clockService;
    private final ObjectMapper objectMapper;

    public GameWebSocketHandler(GameRoomService gameRoomService, GameServiceClient gameServiceClient,
                                ClockService clockService, ObjectMapper objectMapper) {
        this.gameRoomService = gameRoomService;
        this.gameServiceClient = gameServiceClient;
        this.clockService = clockService;
        this.objectMapper = objectMapper;
    }

    /**
     * Called when a new WebSocket connection is established
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();

        // Extract gameId from query parameter
        String gameId = extractGameIdFromUri(session.getUri());
        if (gameId == null || gameId.trim().isEmpty()) {
            log.warn("Connection rejected: missing gameId parameter for session {}", sessionId);
            session.sendMessage(new TextMessage("{\"type\":\"ERROR\",\"message\":\"Missing gameId parameter\"}"));
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        // Extract X-User-Id from headers
        String userId = extractUserIdFromHeaders(session);

        // Fallback: Extract userId from query parameter (for browser testing)
        if (userId == null || userId.trim().isEmpty()) {
            userId = extractUserIdFromUri(session.getUri());
        }

        if (userId == null || userId.trim().isEmpty()) {
            log.warn("Connection rejected: missing userId (header or query param) for session {}", sessionId);
            session.sendMessage(new TextMessage("{\"type\":\"ERROR\",\"message\":\"Missing userId (use X-User-Id header or userId query param)\"}"));
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        log.info("WebSocket connection established: sessionId={}, gameId={}, userId={}",
                sessionId, gameId, userId);

        // Fetch current game state from Game Service
        try {
            GameServiceResponse gameState = gameServiceClient.getGameState(gameId, userId);

            // Add session to game room
            gameRoomService.addSessionToGame(gameId, userId, session);

            // Send connection confirmation to the user
            String confirmationMessage = String.format(
                "{\"type\":\"CONNECTED\",\"gameId\":\"%s\",\"userId\":\"%s\",\"message\":\"Connected to game room\"}",
                gameId, userId
            );
            gameRoomService.sendToSession(session, confirmationMessage);

            // Send current game state to the newly connected client
            sendGameState(session, gameState);

            // Resume clock if reconnecting within grace period
            if (clockService.hasClock(gameId)) {
                clockService.resumeClockOnReconnect(gameId);
                broadcastClockUpdate(gameId);
            }

            // Broadcast USER_JOINED event to all players in the game
            String joinMessage = String.format(
                "{\"type\":\"USER_JOINED\",\"gameId\":\"%s\",\"userId\":\"%s\",\"players\":%d}",
                gameId, userId, gameRoomService.getGameRoomSize(gameId)
            );
            gameRoomService.broadcastToGame(gameId, joinMessage);

        } catch (GameServiceClient.GameServiceException e) {
            log.error("Failed to fetch game state for gameId {}: {}", gameId, e.getMessage());
            session.sendMessage(new TextMessage(String.format(
                "{\"type\":\"ERROR\",\"message\":\"Failed to load game: %s\"}",
                e.getMessage()
            )));
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    /**
     * Called when a text message is received from the client
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String sessionId = session.getId();
        String gameId = gameRoomService.getGameId(session);
        String userId = gameRoomService.getUserId(session);
        String payload = message.getPayload();

        log.info("Received message from sessionId={}, gameId={}, userId={}: {}",
                sessionId, gameId, userId, payload);

        if (gameId == null) {
            log.warn("Received message from unregistered session {}", sessionId);
            gameRoomService.sendToSession(session, "{\"type\":\"ERROR\",\"message\":\"Session not in a game room\"}");
            return;
        }

        try {
            // Parse incoming message as JSON
            JsonNode jsonNode = objectMapper.readTree(payload);
            String messageType = jsonNode.has("type") ? jsonNode.get("type").asText() : null;

            if (messageType == null) {
                log.warn("Message missing 'type' field from session {}", sessionId);
                gameRoomService.sendToSession(session, "{\"type\":\"ERROR\",\"message\":\"Message must have 'type' field\"}");
                return;
            }

            // Handle MOVE message
            if ("MOVE".equals(messageType)) {
                handleMoveMessage(session, gameId, userId, jsonNode);
            } else {
                // For other message types, broadcast as before
                String broadcastMessage = String.format(
                    "{\"type\":\"MESSAGE\",\"gameId\":\"%s\",\"userId\":\"%s\",\"data\":%s}",
                    gameId, userId, payload
                );
                gameRoomService.broadcastToGame(gameId, broadcastMessage);
            }

        } catch (Exception e) {
            log.error("Error processing message from session {}: {}", sessionId, e.getMessage(), e);
            gameRoomService.sendToSession(session,
                String.format("{\"type\":\"ERROR\",\"message\":\"Invalid message format: %s\"}", e.getMessage()));
        }
    }

    /**
     * Handle MOVE message: validate with Game Service and broadcast result
     */
    private void handleMoveMessage(WebSocketSession session, String gameId, String userId, JsonNode jsonNode) {
        try {
            // Extract move data
            JsonNode dataNode = jsonNode.get("data");
            if (dataNode == null) {
                gameRoomService.sendToSession(session, "{\"type\":\"ERROR\",\"message\":\"MOVE message missing 'data' field\"}");
                return;
            }

            MoveMessage moveMessage = objectMapper.treeToValue(dataNode, MoveMessage.class);

            if (moveMessage.getFrom() == null || moveMessage.getTo() == null) {
                gameRoomService.sendToSession(session, "{\"type\":\"ERROR\",\"message\":\"Move must have 'from' and 'to' fields\"}");
                return;
            }

            log.info("Processing MOVE: gameId={}, userId={}, from={}, to={}, promotion={}",
                    gameId, userId, moveMessage.getFrom(), moveMessage.getTo(), moveMessage.getPromotion());

            // Prepare request for Game Service
            GameServiceMoveRequest moveRequest = new GameServiceMoveRequest();
            moveRequest.setFrom(moveMessage.getFrom());
            moveRequest.setTo(moveMessage.getTo());
            moveRequest.setPromotion(moveMessage.getPromotion());

            // Submit move to Game Service
            GameServiceResponse gameResponse = gameServiceClient.submitMove(gameId, userId, moveRequest);

            // Move accepted - broadcast MOVE_RESULT to all players in the game
            broadcastMoveResult(gameId, gameResponse);

        } catch (GameServiceClient.GameServiceException e) {
            // Move rejected - send MOVE_REJECTED only to sender
            log.warn("Move rejected for session {}: {}", session.getId(), e.getMessage());
            sendMoveRejected(session, e.getMessage());

        } catch (Exception e) {
            log.error("Unexpected error handling MOVE message from session {}", session.getId(), e);
            sendMoveRejected(session, "Internal error: " + e.getMessage());
        }
    }

    /**
     * Send current game state to a newly connected client
     */
    private void sendGameState(WebSocketSession session, GameServiceResponse gameState) {
        try {
            GameStateMessage stateMessage = new GameStateMessage();
            stateMessage.setFen(gameState.getFenPosition());
            stateMessage.setCurrentTurn(gameState.getCurrentTurn());
            stateMessage.setStatus(gameState.getStatus());

            // Extract last move if available
            if (gameState.getMoves() != null && !gameState.getMoves().isEmpty()) {
                GameServiceResponse.MoveInfo lastMove = gameState.getMoves().get(gameState.getMoves().size() - 1);

                GameStateMessage.LastMoveInfo lastMoveInfo = new GameStateMessage.LastMoveInfo();
                lastMoveInfo.setFrom(lastMove.getFrom());
                lastMoveInfo.setTo(lastMove.getTo());
                lastMoveInfo.setPiece(lastMove.getPiece());
                lastMoveInfo.setSan(lastMove.getSan());
                lastMoveInfo.setIsCapture(lastMove.getIsCapture());
                lastMoveInfo.setIsCheck(lastMove.getIsCheck());
                lastMoveInfo.setIsCheckmate(lastMove.getIsCheckmate());

                stateMessage.setLastMove(lastMoveInfo);
            }

            WebSocketMessage wsMessage = new WebSocketMessage("GAME_STATE", stateMessage);
            String jsonMessage = objectMapper.writeValueAsString(wsMessage);

            log.info("Sending GAME_STATE to session {}: status={}, turn={}",
                    session.getId(), gameState.getStatus(), gameState.getCurrentTurn());
            gameRoomService.sendToSession(session, jsonMessage);

            // Initialize clock if game is in progress and has time control
            if ("IN_PROGRESS".equals(gameState.getStatus()) && gameState.getTimeControl() != null && gameState.getTimeControl() > 0) {
                String gameId = gameRoomService.getGameId(session);
                if (gameId != null && !clockService.hasClock(gameId)) {
                    // Convert seconds to milliseconds
                    long whiteTimeMs = (gameState.getWhiteTimeRemaining() != null ? gameState.getWhiteTimeRemaining() : gameState.getTimeControl()) * 1000L;
                    long blackTimeMs = (gameState.getBlackTimeRemaining() != null ? gameState.getBlackTimeRemaining() : gameState.getTimeControl()) * 1000L;

                    clockService.initializeClock(gameId, whiteTimeMs, blackTimeMs, gameState.getCurrentTurn());

                    // Send initial clock update
                    broadcastClockUpdate(gameId);
                }
            }

        } catch (Exception e) {
            log.error("Error sending game state to session {}", session.getId(), e);
        }
    }

    /**
     * Broadcast MOVE_RESULT to all players in the game
     */
    private void broadcastMoveResult(String gameId, GameServiceResponse gameResponse) {
        try {
            // Update clock after move
            if (clockService.hasClock(gameId)) {
                int incrementMs = gameResponse.getTimeIncrement() != null ? gameResponse.getTimeIncrement() * 1000 : 0;
                clockService.updateAfterMove(gameId, incrementMs);

                // Check for timeout
                String timedOutColor = clockService.checkTimeout(gameId);
                if (timedOutColor != null) {
                    // Find a userId for the timed out player (we'll use the game service resign endpoint)
                    // For now, we'll handle this in the grace timer expiry
                    log.warn("Player {} timed out after move in game {}", timedOutColor, gameId);
                }
            }

            // Extract the last move from the response
            if (gameResponse.getMoves() != null && !gameResponse.getMoves().isEmpty()) {
                GameServiceResponse.MoveInfo lastMove = gameResponse.getMoves().get(gameResponse.getMoves().size() - 1);

                MoveResultMessage moveResult = new MoveResultMessage();
                moveResult.setFrom(lastMove.getFrom());
                moveResult.setTo(lastMove.getTo());
                moveResult.setFen(gameResponse.getFenPosition());
                moveResult.setNextTurn(gameResponse.getCurrentTurn());
                moveResult.setPiece(lastMove.getPiece());
                moveResult.setSan(lastMove.getSan());
                moveResult.setIsCapture(lastMove.getIsCapture());
                moveResult.setIsCheck(lastMove.getIsCheck());
                moveResult.setIsCheckmate(lastMove.getIsCheckmate());

                WebSocketMessage wsMessage = new WebSocketMessage("MOVE_RESULT", moveResult);
                String jsonMessage = objectMapper.writeValueAsString(wsMessage);

                log.info("Broadcasting MOVE_RESULT to game {}: {}", gameId, jsonMessage);
                gameRoomService.broadcastToGame(gameId, jsonMessage);

                // Broadcast clock update after move
                if (clockService.hasClock(gameId)) {
                    broadcastClockUpdate(gameId);
                }
            }

        } catch (Exception e) {
            log.error("Error broadcasting move result for game {}", gameId, e);
        }
    }

    /**
     * Handle move notification from game-service HTTP API
     * This is called when game-service processes a move via REST API
     */
    public void handleMoveFromGameService(String gameId, GameServiceResponse gameResponse) {
        log.info("Handling move from game-service for game {}: status={}, turn={}", 
                 gameId, gameResponse.getStatus(), gameResponse.getCurrentTurn());
        broadcastMoveResult(gameId, gameResponse);
    }

    /**
     * Send MOVE_REJECTED to the sender only
     */
    private void sendMoveRejected(WebSocketSession session, String reason) {
        try {
            MoveRejectedMessage rejection = new MoveRejectedMessage(reason);
            WebSocketMessage wsMessage = new WebSocketMessage("MOVE_REJECTED", rejection);
            String jsonMessage = objectMapper.writeValueAsString(wsMessage);

            log.info("Sending MOVE_REJECTED to session {}: {}", session.getId(), jsonMessage);
            gameRoomService.sendToSession(session, jsonMessage);

        } catch (Exception e) {
            log.error("Error sending MOVE_REJECTED to session {}", session.getId(), e);
        }
    }

    /**
     * Broadcast CLOCK_UPDATE to all players in a game
     */
    private void broadcastClockUpdate(String gameId) {
        try {
            GameClock clock = clockService.getClock(gameId);
            if (clock == null) {
                return;
            }

            ClockUpdateMessage clockUpdate = new ClockUpdateMessage();
            clockUpdate.setWhiteTimeMs(clock.getWhiteTimeMs());
            clockUpdate.setBlackTimeMs(clock.getBlackTimeMs());
            clockUpdate.setActiveColor(clock.getActiveColor());

            WebSocketMessage wsMessage = new WebSocketMessage("CLOCK_UPDATE", clockUpdate);
            String jsonMessage = objectMapper.writeValueAsString(wsMessage);

            log.debug("Broadcasting CLOCK_UPDATE to game {}: white={}ms, black={}ms",
                    gameId, clock.getWhiteTimeMs(), clock.getBlackTimeMs());
            gameRoomService.broadcastToGame(gameId, jsonMessage);

        } catch (Exception e) {
            log.error("Error broadcasting clock update for game {}", gameId, e);
        }
    }

    /**
     * Handle player timeout
     */
    private void handleTimeout(String gameId, String userId, String timedOutColor) {
        try {
            log.warn("Player {} timed out in game {}", userId, gameId);

            // Report timeout to Game Service
            gameServiceClient.reportTimeout(gameId, userId);

            // Broadcast timeout message
            String winner = "WHITE".equals(timedOutColor) ? "BLACK" : "WHITE";
            TimeoutMessage timeoutMsg = new TimeoutMessage(timedOutColor, winner, "Time out");
            WebSocketMessage wsMessage = new WebSocketMessage("TIMEOUT", timeoutMsg);
            String jsonMessage = objectMapper.writeValueAsString(wsMessage);

            gameRoomService.broadcastToGame(gameId, jsonMessage);

            // Clean up clock
            clockService.removeClock(gameId);

        } catch (Exception e) {
            log.error("Error handling timeout for game {}", gameId, e);
        }
    }

    /**
     * Called when the WebSocket connection is closed
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();
        String userId = gameRoomService.getUserId(session);
        String gameId = gameRoomService.removeSession(session);

        log.info("WebSocket connection closed: sessionId={}, gameId={}, userId={}, status={}",
                sessionId, gameId, userId, status);

        // Handle clock pause and grace period if game has a clock
        if (gameId != null && clockService.hasClock(gameId)) {
            int remainingPlayers = gameRoomService.getGameRoomSize(gameId);

            // Only start grace timer if there are still other players in the game
            if (remainingPlayers > 0) {
                String finalUserId = userId;
                clockService.pauseClockOnDisconnect(gameId, () -> {
                    // Grace period expired - player timed out due to disconnect
                    log.warn("Grace period expired for user {} in game {}", finalUserId, gameId);
                    handleTimeout(gameId, finalUserId, determinePlayerColor(gameId, finalUserId));
                });
            } else {
                // No other players, just remove the clock
                clockService.removeClock(gameId);
            }
        }

        // Broadcast USER_LEFT event to remaining players in the game
        if (gameId != null && userId != null) {
            String leaveMessage = String.format(
                "{\"type\":\"USER_LEFT\",\"gameId\":\"%s\",\"userId\":\"%s\",\"players\":%d}",
                gameId, userId, gameRoomService.getGameRoomSize(gameId)
            );
            gameRoomService.broadcastToGame(gameId, leaveMessage);
        }
    }

    /**
     * Determine player color from game state
     * This is a simplified version - in production you'd track player colors
     */
    private String determinePlayerColor(String gameId, String userId) {
        try {
            GameServiceResponse gameState = gameServiceClient.getGameState(gameId, userId);
            if (gameState.getWhitePlayer() != null &&
                userId.equals(String.valueOf(gameState.getWhitePlayer().getId()))) {
                return "WHITE";
            } else if (gameState.getBlackPlayer() != null &&
                       userId.equals(String.valueOf(gameState.getBlackPlayer().getId()))) {
                return "BLACK";
            }
        } catch (Exception e) {
            log.error("Error determining player color for userId {} in game {}", userId, gameId, e);
        }
        return "WHITE"; // Default fallback
    }

    /**
     * Called when a transport error occurs
     */
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket transport error: sessionId={}, gameId={}, userId={}",
                session.getId(),
                gameRoomService.getGameId(session),
                gameRoomService.getUserId(session),
                exception);
    }

    /**
     * Extract gameId from WebSocket URI query parameter
     * Expected format: ws://host/ws/game?gameId=123
     */
    private String extractGameIdFromUri(URI uri) {
        if (uri == null) {
            return null;
        }

        return UriComponentsBuilder.fromUri(uri)
                .build()
                .getQueryParams()
                .getFirst("gameId");
    }

    /**
     * Extract X-User-Id from WebSocket handshake headers
     */
    private String extractUserIdFromHeaders(WebSocketSession session) {
        HttpHeaders headers = session.getHandshakeHeaders();
        List<String> userIdHeaders = headers.get("X-User-Id");

        if (userIdHeaders != null && !userIdHeaders.isEmpty()) {
            return userIdHeaders.get(0);
        }

        return null;
    }

    /**
     * Extract userId from query parameter (fallback for browser testing)
     * Expected format: ws://host/ws/game?gameId=123&userId=101
     */
    private String extractUserIdFromUri(URI uri) {
        if (uri == null) {
            return null;
        }

        return UriComponentsBuilder.fromUri(uri)
                .build()
                .getQueryParams()
                .getFirst("userId");
    }
}
