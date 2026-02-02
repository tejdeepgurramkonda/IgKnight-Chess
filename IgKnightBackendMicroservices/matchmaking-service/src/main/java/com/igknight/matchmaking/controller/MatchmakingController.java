package com.igknight.matchmaking.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.igknight.matchmaking.dto.JoinMatchmakingRequest;
import com.igknight.matchmaking.dto.JoinMatchmakingResponse;
import com.igknight.matchmaking.dto.MatchFound;
import com.igknight.matchmaking.service.MatchmakingService;

import jakarta.validation.Valid;

/**
 * Matchmaking controller - handles matchmaking queue endpoints
 */
@RestController
@RequestMapping("/matchmaking")
public class MatchmakingController {

    private static final Logger log = LoggerFactory.getLogger(MatchmakingController.class);

    private final MatchmakingService matchmakingService;

    @Autowired
    public MatchmakingController(MatchmakingService matchmakingService) {
        this.matchmakingService = matchmakingService;
    }

    /**
     * Join the matchmaking queue and attempt to find a match
     * @param userId User ID from API Gateway (X-User-Id header)
     * @param username Username from API Gateway (X-Username header)
     * @param request Join request containing rating and timeControl
     * @return Response with QUEUED status or MATCHED status with match data
     */
    @PostMapping("/join")
    public ResponseEntity<JoinMatchmakingResponse> joinMatchmaking(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-Username", required = false) String username,
            @Valid @RequestBody JoinMatchmakingRequest request) {

        // Validate X-User-Id header
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new JoinMatchmakingResponse("ERROR", "Missing or invalid X-User-Id header"));
        }

        // Validate X-Username header
        if (username == null || username.trim().isEmpty()) {
            // Use username from request body if header is not available (for testing)
            username = request.getUsername();
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(new JoinMatchmakingResponse("ERROR", "Missing or invalid X-Username header"));
            }
        }

        // Check if user is already in queue
        if (matchmakingService.isInQueue(userId)) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(new JoinMatchmakingResponse("ERROR", "User already in queue"));
        }

        log.info("User {} joining queue: rating={}, timeControl={}", userId, request.getRating(), request.getTimeControl());

        // Attempt to join queue and find a match
        MatchFound match = matchmakingService.joinQueueAndMatch(userId, username, request.getRating(), request.getTimeControl());

        if (match != null) {
            log.info("User {} matched immediately with gameId={}", userId, match.getGameId());
            // Match found immediately
            JoinMatchmakingResponse response = new JoinMatchmakingResponse();
            response.setStatus("MATCHED");
            response.setMessage("Match found and game created");
            response.setMatch(match);
            return ResponseEntity.ok(response);
        } else {
            log.info("User {} queued, waiting for opponent", userId);
            // No match found, user is queued
            return ResponseEntity.ok(new JoinMatchmakingResponse("QUEUED", "Successfully joined matchmaking queue"));
        }
    }

    /**
     * Leave the matchmaking queue
     * @param userId User ID from API Gateway (X-User-Id header)
     * @return Response with LEFT status or error
     */
    @PostMapping("/leave")
    public ResponseEntity<JoinMatchmakingResponse> leaveMatchmaking(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        // Validate X-User-Id header
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new JoinMatchmakingResponse("ERROR", "Missing or invalid X-User-Id header"));
        }

        // Attempt to leave queue
        boolean left = matchmakingService.leaveQueue(userId);

        if (left) {
            return ResponseEntity.ok(new JoinMatchmakingResponse("LEFT", "Successfully left matchmaking queue"));
        } else {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(new JoinMatchmakingResponse("ERROR", "User not in queue"));
        }
    }

    @GetMapping("/health")
    public String health() {
        return "Matchmaking Service is running";
    }

    /**
     * Debug endpoint to see queue status
     */
    @GetMapping("/debug/queue")
    public ResponseEntity<?> debugQueue() {
        return ResponseEntity.ok(Map.of(
            "queueSize", matchmakingService.getQueueSize(),
            "queue", matchmakingService.getQueueDetails()
        ));
    }

    /**
     * Check matchmaking status - for polling while in queue
     * @param userId User ID from API Gateway (X-User-Id header)
     * @return Response with MATCHED status if match found, QUEUED if still waiting
     */
    @GetMapping("/status")
    public ResponseEntity<JoinMatchmakingResponse> checkStatus(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        // Validate X-User-Id header
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new JoinMatchmakingResponse("ERROR", "Missing or invalid X-User-Id header"));
        }

        // Check if match was found
        MatchFound match = matchmakingService.getMatch(userId);
        
        if (match != null) {
            // Match found! (getMatch already removed user from queue)
            JoinMatchmakingResponse response = new JoinMatchmakingResponse();
            response.setStatus("MATCHED");
            response.setMessage("Match found");
            response.setMatch(match);
            return ResponseEntity.ok(response);
        }
        
        // Check if still in queue
        if (matchmakingService.isInQueue(userId)) {
            return ResponseEntity.ok(new JoinMatchmakingResponse("QUEUED", "Still searching for opponent"));
        }
        
        // Not in queue and no match found
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new JoinMatchmakingResponse("ERROR", "Not in matchmaking queue"));
    }
}


