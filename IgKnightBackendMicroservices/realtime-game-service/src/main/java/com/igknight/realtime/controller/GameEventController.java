package com.igknight.realtime.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.igknight.realtime.dto.GameServiceResponse;
import com.igknight.realtime.handler.GameWebSocketHandler;

/**
 * REST Controller for receiving game events from game-service
 */
@RestController
@RequestMapping("/api/realtime/games")
public class GameEventController {

    private static final Logger log = LoggerFactory.getLogger(GameEventController.class);

    private final GameWebSocketHandler gameWebSocketHandler;

    public GameEventController(GameWebSocketHandler gameWebSocketHandler) {
        this.gameWebSocketHandler = gameWebSocketHandler;
    }

    /**
     * Receive move notification from game-service and broadcast to connected clients
     * @param gameId The game ID
     * @param gameResponse The updated game state after the move
     */
    @PostMapping("/{gameId}/move")
    public ResponseEntity<Void> handleMove(@PathVariable String gameId, 
                                           @RequestBody GameServiceResponse gameResponse) {
        try {
            log.info("Received move notification for game {}", gameId);
            gameWebSocketHandler.handleMoveFromGameService(gameId, gameResponse);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error handling move notification for game {}", gameId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
