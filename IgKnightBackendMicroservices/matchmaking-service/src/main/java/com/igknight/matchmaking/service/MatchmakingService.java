package com.igknight.matchmaking.service;

import com.igknight.matchmaking.client.GameServiceClient;
import com.igknight.matchmaking.dto.GameServiceResponse;
import com.igknight.matchmaking.dto.MatchFound;
import com.igknight.matchmaking.model.QueueEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Matchmaking service - handles matchmaking queue logic
 */
@Service
public class MatchmakingService {

    private static final Logger log = LoggerFactory.getLogger(MatchmakingService.class);

    // Thread-safe in-memory queue: userId -> QueueEntry
    private final Map<String, QueueEntry> matchmakingQueue = new ConcurrentHashMap<>();

    // Thread-safe storage for found matches: userId -> MatchFound
    // Stores matches for waiting players so they can poll for results
    private final Map<String, MatchFound> foundMatches = new ConcurrentHashMap<>();

    // Rating window for matching (±100 rating points)
    private static final int RATING_WINDOW = 100;

    private final GameServiceClient gameServiceClient;

    public MatchmakingService(GameServiceClient gameServiceClient) {
        this.gameServiceClient = gameServiceClient;
    }

    /**
     * Add a user to the matchmaking queue and attempt to find a match
     * @param userId User ID from X-User-Id header
     * @param username Username from X-Username header
     * @param rating User's rating
     * @param timeControl Game time control
     * @return MatchFound if a match was found, null if queued without match
     */
    public synchronized MatchFound joinQueueAndMatch(String userId, String username, Integer rating, String timeControl) {
        // Prevent duplicate entries
        if (matchmakingQueue.containsKey(userId)) {
            return null; // User already in queue
        }

        QueueEntry newEntry = new QueueEntry(userId, username, rating, timeControl, LocalDateTime.now());

        // CRITICAL: Try to match with existing queue entries BEFORE adding to queue
        // This ensures FIFO: existing waiting players are matched first
        MatchFound match = findMatchInQueue(newEntry);

        if (match != null) {
            // Match found with existing queue entry - don't add new entry to queue
            log.info("Matched user {} with existing queue entry", userId);
            return match;
        }

        // No match found - add to queue and wait
        matchmakingQueue.put(userId, newEntry);
        log.info("User {} added to queue, no immediate match found", userId);

        return null; // Queued without match
    }

    /**
     * Find a match for the given player in the existing queue and create a game
     * CRITICAL: This method is called BEFORE adding the new player to the queue
     * to ensure FIFO matching (existing waiting players are matched first)
     *
     * @param newPlayer The new player looking for a match
     * @return MatchFound if a compatible opponent is found and game created, null otherwise
     */
    private MatchFound findMatchInQueue(QueueEntry newPlayer) {
        // Get all compatible players already in queue (excluding the player themselves)
        List<QueueEntry> compatiblePlayers = matchmakingQueue.values().stream()
                .filter(entry -> !entry.getUserId().equals(newPlayer.getUserId())) // Exclude self
                .filter(entry -> entry.getTimeControl().equals(newPlayer.getTimeControl())) // Same time control
                .filter(entry -> isRatingCompatible(newPlayer.getRating(), entry.getRating())) // Within rating window
                .sorted(Comparator.comparing(QueueEntry::getJoinedAt)) // FIFO order - oldest first
                .collect(Collectors.toList());

        // If we found at least one compatible player, match with the first (oldest in queue)
        if (!compatiblePlayers.isEmpty()) {
            QueueEntry waitingPlayer = compatiblePlayers.get(0);

            // First joined player (waiting in queue) becomes white
            // New player (just joined) becomes black
            QueueEntry whitePlayer = waitingPlayer;
            QueueEntry blackPlayer = newPlayer;

            log.info("FIFO Match found: white={} (waiting since {}), black={} (just joined)",
                     whitePlayer.getUserId(), whitePlayer.getJoinedAt(), blackPlayer.getUserId());

            // CRITICAL: Remove waiting player from queue BEFORE creating game
            // This prevents race condition where another player might match with same waiting player
            QueueEntry removed = matchmakingQueue.remove(waitingPlayer.getUserId());

            if (removed == null) {
                log.warn("Race condition detected: waiting player {} already removed from queue", waitingPlayer.getUserId());
                return null; // Another thread already matched with this player
            }

            // Create game via Game Service
            try {
                // Create game with white player (the one who was waiting)
                GameServiceResponse gameResponse = gameServiceClient.createGame(
                    whitePlayer.getUserId(),
                    whitePlayer.getUsername(),
                    newPlayer.getTimeControl()
                );

                if (gameResponse == null || gameResponse.getGameId() == null) {
                    log.error("Failed to create game, re-adding white player to queue");
                    matchmakingQueue.put(waitingPlayer.getUserId(), waitingPlayer); // Re-add to queue
                    return null;
                }

                // Join game with black player (the new player)
                GameServiceResponse updatedGame = gameServiceClient.joinGame(
                    gameResponse.getGameId(),
                    blackPlayer.getUserId(),
                    blackPlayer.getUsername()
                );

                if (updatedGame == null) {
                    log.error("Failed to join game {}, re-adding white player to queue", gameResponse.getGameId());
                    matchmakingQueue.put(waitingPlayer.getUserId(), waitingPlayer); // Re-add to queue
                    return null;
                }

                log.info("Game created successfully: gameId={}, white={}, black={}",
                         updatedGame.getGameId(), whitePlayer.getUserId(), blackPlayer.getUserId());

                // Create match for the NEW player (black)
                MatchFound blackPlayerMatch = new MatchFound();
                blackPlayerMatch.setGameId(updatedGame.getGameId());
                blackPlayerMatch.setOpponentId(waitingPlayer.getUserId());
                blackPlayerMatch.setTimeControl(newPlayer.getTimeControl());

                // Create and STORE match for the WAITING player (white) so they can poll for it
                MatchFound whitePlayerMatch = new MatchFound();
                whitePlayerMatch.setGameId(updatedGame.getGameId());
                whitePlayerMatch.setOpponentId(newPlayer.getUserId());
                whitePlayerMatch.setTimeControl(newPlayer.getTimeControl());
                foundMatches.put(waitingPlayer.getUserId(), whitePlayerMatch);

                return blackPlayerMatch;

            } catch (Exception e) {
                log.error("Error creating game, re-adding white player to queue", e);
                matchmakingQueue.put(waitingPlayer.getUserId(), waitingPlayer); // Re-add to queue on error
                return null;
            }
        }

        return null; // No compatible match found in queue
    }

    /**
     * Check if two ratings are within the matching window
     * @param rating1 First player's rating
     * @param rating2 Second player's rating
     * @return true if ratings are compatible
     */
    private boolean isRatingCompatible(Integer rating1, Integer rating2) {
        return Math.abs(rating1 - rating2) <= RATING_WINDOW;
    }

    /**
     * Remove a user from the matchmaking queue
     * @param userId User ID from X-User-Id header
     * @return true if removed successfully, false if user not in queue
     */
    public boolean leaveQueue(String userId) {
        return matchmakingQueue.remove(userId) != null;
    }

    /**
     * Check if a user is in the queue
     * @param userId User ID
     * @return true if user is in queue
     */
    public boolean isInQueue(String userId) {
        return matchmakingQueue.containsKey(userId);
    }

    /**
     * Check if a match was found for a waiting player
     * Used for polling while in queue
     * CRITICAL: This method now also attempts to find a match for the waiting player
     * @param userId User ID  
     * @return MatchFound if a match was found and stored OR if we can match now, null if still waiting
     */
    public synchronized MatchFound getMatch(String userId) {
        // First check if there's a stored match for this user (they might be the "white" player)
        MatchFound storedMatch = foundMatches.remove(userId);
        if (storedMatch != null) {
            log.info("User {} found stored match: gameId={}", userId, storedMatch.getGameId());
            return storedMatch;
        }
        
        // If no stored match, check if this user is in queue and try to match them
        QueueEntry thisPlayer = matchmakingQueue.get(userId);
        if (thisPlayer == null) {
            log.debug("User {} not in queue (already matched or left)", userId);
            return null; // User not in queue (already matched or left)
        }
        
        // Try to find a match for this waiting player with others in queue
        // This handles the case where multiple users are polling simultaneously
        MatchFound newMatch = findMatchInQueue(thisPlayer);
        if (newMatch != null) {
            log.info("User {} matched during polling: gameId={}", userId, newMatch.getGameId());
            // Match found! Remove this player from queue
            matchmakingQueue.remove(userId);
        }
        
        return newMatch;
    }

    /**
     * Get current queue size (for debugging)
     * @return Number of users in queue
     */
    public int getQueueSize() {
        return matchmakingQueue.size();
    }

    /**
     * Get queue details (for debugging)
     */
    public Map<String, QueueEntry> getQueueDetails() {
        return new java.util.HashMap<>(matchmakingQueue);
    }
}
