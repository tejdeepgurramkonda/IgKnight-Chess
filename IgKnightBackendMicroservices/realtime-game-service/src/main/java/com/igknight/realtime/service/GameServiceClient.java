package com.igknight.realtime.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.igknight.realtime.dto.GameServiceMoveRequest;
import com.igknight.realtime.dto.GameServiceResponse;

/**
 * Service to communicate with Game Service for move validation
 */
@Service
public class GameServiceClient {

    private static final Logger log = LoggerFactory.getLogger(GameServiceClient.class);

    private final RestTemplate restTemplate;
    private final String gameServiceUrl;

    public GameServiceClient(
            RestTemplate restTemplate,
            @Value("${game.service.url:http://localhost:8082}") String gameServiceUrl) {
        this.restTemplate = restTemplate;
        this.gameServiceUrl = gameServiceUrl;
    }

    /**
     * Submit a move to Game Service for validation and persistence
     * @param gameId The game ID
     * @param userId The user ID making the move
     * @param moveRequest The move details
     * @return GameServiceResponse on success
     * @throws GameServiceException on failure
     */
    public GameServiceResponse submitMove(String gameId, String userId, GameServiceMoveRequest moveRequest) {
        String url = gameServiceUrl + "/api/chess/games/" + gameId + "/moves";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-User-Id", userId);

        HttpEntity<GameServiceMoveRequest> entity = new HttpEntity<>(moveRequest, headers);

        try {
            log.info("Submitting move to Game Service: gameId={}, userId={}, from={}, to={}",
                    gameId, userId, moveRequest.getFrom(), moveRequest.getTo());

            ResponseEntity<GameServiceResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    GameServiceResponse.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Move accepted by Game Service: gameId={}", gameId);
                return response.getBody();
            } else {
                throw new GameServiceException("Unexpected response from Game Service");
            }

        } catch (HttpClientErrorException e) {
            String errorMessage = extractErrorMessage(e);
            log.warn("Move rejected by Game Service: gameId={}, error={}", gameId, errorMessage);
            throw new GameServiceException(errorMessage);

        } catch (ResourceAccessException e) {
            log.error("Failed to connect to Game Service: {}", e.getMessage());
            throw new GameServiceException("Game Service unavailable");

        } catch (Exception e) {
            log.error("Unexpected error calling Game Service", e);
            throw new GameServiceException("Internal error: " + e.getMessage());
        }
    }

    /**
     * Get game state from Game Service
     * @param gameId The game ID
     * @param userId The user ID requesting the game state (for authorization)
     * @return GameServiceResponse on success
     * @throws GameServiceException on failure
     */
    public GameServiceResponse getGameState(String gameId, String userId) {
        String url = gameServiceUrl + "/api/chess/games/" + gameId;

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            log.info("Fetching game state from Game Service: gameId={}, userId={}", gameId, userId);

            ResponseEntity<GameServiceResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    GameServiceResponse.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Game state retrieved successfully: gameId={}", gameId);
                return response.getBody();
            } else {
                throw new GameServiceException("Unexpected response from Game Service");
            }

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                log.warn("Game not found: gameId={}", gameId);
                throw new GameServiceException("Game not found");
            }
            String errorMessage = extractErrorMessage(e);
            log.warn("Failed to get game state: gameId={}, error={}", gameId, errorMessage);
            throw new GameServiceException(errorMessage);

        } catch (ResourceAccessException e) {
            log.error("Failed to connect to Game Service: {}", e.getMessage());
            throw new GameServiceException("Game Service unavailable");

        } catch (Exception e) {
            log.error("Unexpected error calling Game Service", e);
            throw new GameServiceException("Internal error: " + e.getMessage());
        }
    }

    /**
     * Report timeout to Game Service (player ran out of time or disconnect timeout)
     * @param gameId The game ID
     * @param userId The user ID of the player timing out
     * @return GameServiceResponse on success
     * @throws GameServiceException on failure
     */
    public GameServiceResponse reportTimeout(String gameId, String userId) {
        String url = gameServiceUrl + "/api/chess/games/" + gameId + "/resign";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            log.info("Reporting timeout to Game Service: gameId={}, userId={}", gameId, userId);

            ResponseEntity<GameServiceResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    GameServiceResponse.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Timeout reported successfully: gameId={}", gameId);
                return response.getBody();
            } else {
                throw new GameServiceException("Unexpected response from Game Service");
            }

        } catch (HttpClientErrorException e) {
            String errorMessage = extractErrorMessage(e);
            log.warn("Failed to report timeout: gameId={}, error={}", gameId, errorMessage);
            throw new GameServiceException(errorMessage);

        } catch (ResourceAccessException e) {
            log.error("Failed to connect to Game Service: {}", e.getMessage());
            throw new GameServiceException("Game Service unavailable");

        } catch (Exception e) {
            log.error("Unexpected error calling Game Service", e);
            throw new GameServiceException("Internal error: " + e.getMessage());
        }
    }

    /**
     * Extract error message from HTTP error response
     */
    private String extractErrorMessage(HttpClientErrorException e) {
        String responseBody = e.getResponseBodyAsString();

        // Try to extract error message from JSON response
        if (responseBody != null && responseBody.contains("\"error\"")) {
            try {
                int start = responseBody.indexOf("\"error\"") + 9;
                int end = responseBody.indexOf("\"", start);
                if (end > start) {
                    return responseBody.substring(start, end);
                }
            } catch (Exception ex) {
                // Fall through to default
            }
        }

        return e.getMessage();
    }

    /**
     * Custom exception for Game Service errors
     */
    public static class GameServiceException extends RuntimeException {
        public GameServiceException(String message) {
            super(message);
        }
    }
}
