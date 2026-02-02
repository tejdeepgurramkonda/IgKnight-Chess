package com.igknight.realtime.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Service to manage game rooms and WebSocket sessions
 */
@Service
public class GameRoomService {

    private static final Logger log = LoggerFactory.getLogger(GameRoomService.class);

    // Thread-safe mappings
    // gameId -> Set of WebSocketSessions in that game
    private final Map<String, Set<WebSocketSession>> gameRooms = new ConcurrentHashMap<>();

    // sessionId -> gameId
    private final Map<String, String> sessionToGameId = new ConcurrentHashMap<>();

    // sessionId -> userId
    private final Map<String, String> sessionToUserId = new ConcurrentHashMap<>();

    /**
     * Add a session to a game room
     * @param gameId The game ID
     * @param userId The user ID
     * @param session The WebSocket session
     */
    public void addSessionToGame(String gameId, String userId, WebSocketSession session) {
        String sessionId = session.getId();

        // Add session to game room
        gameRooms.computeIfAbsent(gameId, k -> new CopyOnWriteArraySet<>()).add(session);

        // Map session to gameId and userId
        sessionToGameId.put(sessionId, gameId);
        sessionToUserId.put(sessionId, userId);

        log.info("Session {} (user {}) joined game {}", sessionId, userId, gameId);
        log.info("Game {} now has {} players", gameId, gameRooms.get(gameId).size());
    }

    /**
     * Remove a session from all mappings
     * @param session The WebSocket session
     * @return The gameId the session was in (null if not found)
     */
    public String removeSession(WebSocketSession session) {
        String sessionId = session.getId();
        String gameId = sessionToGameId.remove(sessionId);
        String userId = sessionToUserId.remove(sessionId);

        if (gameId != null) {
            Set<WebSocketSession> sessions = gameRooms.get(gameId);
            if (sessions != null) {
                sessions.remove(session);
                log.info("Session {} (user {}) left game {}", sessionId, userId, gameId);
                log.info("Game {} now has {} players", gameId, sessions.size());

                // Clean up empty game rooms
                if (sessions.isEmpty()) {
                    gameRooms.remove(gameId);
                    log.info("Game {} room removed (empty)", gameId);
                }
            }
        }

        return gameId;
    }

    /**
     * Get the user ID for a session
     * @param session The WebSocket session
     * @return The user ID (null if not found)
     */
    public String getUserId(WebSocketSession session) {
        return sessionToUserId.get(session.getId());
    }

    /**
     * Get the game ID for a session
     * @param session The WebSocket session
     * @return The game ID (null if not found)
     */
    public String getGameId(WebSocketSession session) {
        return sessionToGameId.get(session.getId());
    }

    /**
     * Broadcast a message to all sessions in a game room
     * @param gameId The game ID
     * @param message The message to broadcast
     */
    public void broadcastToGame(String gameId, String message) {
        Set<WebSocketSession> sessions = gameRooms.get(gameId);
        if (sessions == null || sessions.isEmpty()) {
            log.warn("No sessions in game {} to broadcast to", gameId);
            return;
        }

        TextMessage textMessage = new TextMessage(message);
        int successCount = 0;
        int failCount = 0;

        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(textMessage);
                    successCount++;
                } catch (IOException e) {
                    log.error("Failed to send message to session {}", session.getId(), e);
                    failCount++;
                }
            } else {
                failCount++;
            }
        }

        log.debug("Broadcast to game {}: {} successful, {} failed", gameId, successCount, failCount);
    }

    /**
     * Send a message to a specific session
     * @param session The WebSocket session
     * @param message The message to send
     */
    public void sendToSession(WebSocketSession session, String message) {
        if (session.isOpen()) {
            try {
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                log.error("Failed to send message to session {}", session.getId(), e);
            }
        }
    }

    /**
     * Get the number of sessions in a game
     * @param gameId The game ID
     * @return The number of sessions
     */
    public int getGameRoomSize(String gameId) {
        Set<WebSocketSession> sessions = gameRooms.get(gameId);
        return sessions != null ? sessions.size() : 0;
    }

    /**
     * Check if a game room exists
     * @param gameId The game ID
     * @return true if the game room exists
     */
    public boolean gameRoomExists(String gameId) {
        return gameRooms.containsKey(gameId);
    }
}
