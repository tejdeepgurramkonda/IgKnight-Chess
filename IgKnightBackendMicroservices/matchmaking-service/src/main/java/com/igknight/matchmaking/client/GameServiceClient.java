package com.igknight.matchmaking.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.igknight.matchmaking.dto.CreateGameRequest;
import com.igknight.matchmaking.dto.GameServiceResponse;

/**
 * Client for communicating with Game Service
 */
@Component
public class GameServiceClient {

    private static final Logger log = LoggerFactory.getLogger(GameServiceClient.class);

    private final RestTemplate restTemplate;

    @Value("${game.service.url:http://localhost:8082}")
    private String gameServiceUrl;

    public GameServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Create a game for matched players
     * @param whitePlayerId The white player's ID
     * @param whitePlayerUsername The white player's username
     * @param timeControl Time control for the game
     * @return GameServiceResponse with game details
     */
    public GameServiceResponse createGame(String whitePlayerId, String whitePlayerUsername, String timeControl) {
        try {
            String url = gameServiceUrl + "/api/chess/games/create";

            // Parse time control (e.g., "10+0" means 10 minutes with 0 increment)
            Integer timeControlSeconds = parseTimeControl(timeControl);
            Integer timeIncrement = parseTimeIncrement(timeControl);

            CreateGameRequest request = new CreateGameRequest();
            request.setTimeControl(timeControlSeconds);
            request.setTimeIncrement(timeIncrement);
            request.setIsRated(true); // Matchmaking games are always rated

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-User-Id", whitePlayerId);
            headers.set("X-Username", whitePlayerUsername);

            HttpEntity<CreateGameRequest> entity = new HttpEntity<>(request, headers);

            log.info("Creating game via Game Service for white player: {} ({})", whitePlayerId, whitePlayerUsername);

            ResponseEntity<GameServiceResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                GameServiceResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                GameServiceResponse body = response.getBody();
                log.info("Game created successfully: gameId={}, response={}", body.getGameId(), body);
                if (body.getGameId() == null) {
                    log.error("Game creation returned null gameId. Full response: {}", body);
                }
                return body;
            } else {
                log.error("Failed to create game: status={}, body={}", response.getStatusCode(), response.getBody());
                return null;
            }

        } catch (Exception e) {
            log.error("Error creating game via Game Service: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Join an existing game as black player
     * @param gameId The game ID to join
     * @param blackPlayerId The black player's ID
     * @param blackPlayerUsername The black player's username
     * @return GameServiceResponse with updated game details
     */
    public GameServiceResponse joinGame(Long gameId, String blackPlayerId, String blackPlayerUsername) {
        try {
            String url = gameServiceUrl + "/api/chess/games/" + gameId + "/join";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-User-Id", blackPlayerId);
            headers.set("X-Username", blackPlayerUsername);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            log.info("Joining game {} via Game Service for black player: {} ({})", gameId, blackPlayerId, blackPlayerUsername);

            ResponseEntity<GameServiceResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                GameServiceResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Player joined game successfully: gameId={}", gameId);
                return response.getBody();
            } else {
                log.error("Failed to join game: status={}", response.getStatusCode());
                return null;
            }

        } catch (Exception e) {
            log.error("Error joining game via Game Service", e);
            return null;
        }
    }

    /**
     * Parse time control string to seconds
     * Format: "10+0" means 10 minutes with 0 increment
     * @param timeControl Time control string
     * @return Time in seconds
     */
    private Integer parseTimeControl(String timeControl) {
        try {
            String[] parts = timeControl.split("\\+");
            int minutes = Integer.parseInt(parts[0]);
            return minutes * 60; // Convert to seconds
        } catch (Exception e) {
            log.warn("Failed to parse time control: {}, using default 600", timeControl);
            return 600; // Default 10 minutes
        }
    }

    /**
     * Parse time increment from time control string
     * Format: "10+5" means 10 minutes with 5 seconds increment
     * @param timeControl Time control string
     * @return Time increment in seconds
     */
    private Integer parseTimeIncrement(String timeControl) {
        try {
            String[] parts = timeControl.split("\\+");
            if (parts.length > 1) {
                return Integer.parseInt(parts[1]);
            }
            return 0;
        } catch (Exception e) {
            log.warn("Failed to parse time increment: {}, using default 0", timeControl);
            return 0;
        }
    }
}
