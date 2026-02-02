package com.igknight.game.client;

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

import com.igknight.game.dto.GameResponse;

/**
 * Client for communicating with Realtime Game Service
 */
@Component
public class RealtimeGameServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RealtimeGameServiceClient.class);

    private final RestTemplate restTemplate;

    @Value("${realtime.service.url:http://localhost:8087}")
    private String realtimeServiceUrl;

    public RealtimeGameServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Notify realtime service about a move in a game
     * @param gameId The game ID
     * @param gameResponse The updated game state after the move
     */
    public void notifyMove(Long gameId, GameResponse gameResponse) {
        try {
            String url = realtimeServiceUrl + "/api/realtime/games/" + gameId + "/move";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<GameResponse> entity = new HttpEntity<>(gameResponse, headers);

            log.info("Notifying realtime service about move in game {}", gameId);

            ResponseEntity<Void> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                Void.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully notified realtime service about move in game {}", gameId);
            } else {
                log.warn("Realtime service returned non-2xx status for game {}: {}", gameId, response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("Failed to notify realtime service about move in game {}: {}", gameId, e.getMessage());
            // Don't throw - move was already saved, this is just notification
        }
    }
}
