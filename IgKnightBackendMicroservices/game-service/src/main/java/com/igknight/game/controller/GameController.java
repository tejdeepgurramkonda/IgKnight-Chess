package com.igknight.game.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.igknight.game.dto.ChatHistoryResponse;
import com.igknight.game.dto.CreateGameRequest;
import com.igknight.game.dto.GameResponse;
import com.igknight.game.dto.LegalMovesResponse;
import com.igknight.game.dto.MakeMoveRequest;
import com.igknight.game.service.ChatService;
import com.igknight.game.service.GameService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/chess")
public class GameController {

    private final GameService gameService;
    private final ChatService chatService;

    public GameController(GameService gameService, ChatService chatService) {
        this.gameService = gameService;
        this.chatService = chatService;
    }

    @PostMapping("/games/create")
    public ResponseEntity<GameResponse> createGame(
            @RequestBody CreateGameRequest request,
            @RequestHeader("X-User-Id") Long playerId,
            @RequestHeader("X-Username") String username) {
        GameResponse game = gameService.createGame(playerId, username, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(game);
    }

    @PostMapping("/games/{gameId}/join")
    public ResponseEntity<GameResponse> joinGame(
            @PathVariable Long gameId,
            @RequestHeader("X-User-Id") Long playerId,
            @RequestHeader("X-Username") String username) {
        GameResponse game = gameService.joinGame(gameId, playerId, username);
        return ResponseEntity.ok(game);
    }

    @GetMapping("/games/{gameId}")
    public ResponseEntity<GameResponse> getGame(@PathVariable Long gameId) {
        GameResponse game = gameService.getGame(gameId);
        return ResponseEntity.ok(game);
    }

    @GetMapping("/games")
    public ResponseEntity<List<GameResponse>> getUserGames(@RequestHeader("X-User-Id") Long playerId) {
        List<GameResponse> games = gameService.getUserGames(playerId);
        return ResponseEntity.ok(games);
    }

    @GetMapping("/games/active")
    public ResponseEntity<List<GameResponse>> getActiveGames(@RequestHeader("X-User-Id") Long playerId) {
        List<GameResponse> games = gameService.getActiveGames(playerId);
        return ResponseEntity.ok(games);
    }

    @PostMapping("/games/{gameId}/moves")
    public ResponseEntity<GameResponse> makeMove(
            @PathVariable Long gameId,
            @Valid @RequestBody MakeMoveRequest request,
            @RequestHeader("X-User-Id") Long playerId) {
        GameResponse game = gameService.makeMove(gameId, playerId, request);
        return ResponseEntity.ok(game);
    }

    @GetMapping("/games/{gameId}/legal-moves/{square}")
    public ResponseEntity<LegalMovesResponse> getLegalMoves(
            @PathVariable Long gameId,
            @PathVariable String square) {
        LegalMovesResponse legalMoves = gameService.getLegalMoves(gameId, square);
        return ResponseEntity.ok(legalMoves);
    }

    @PostMapping("/games/{gameId}/resign")
    public ResponseEntity<GameResponse> resignGame(
            @PathVariable Long gameId,
            @RequestHeader("X-User-Id") Long playerId) {
        GameResponse game = gameService.resignGame(gameId, playerId);
        return ResponseEntity.ok(game);
    }

    @GetMapping("/games/{gameId}/chat")
    public ResponseEntity<ChatHistoryResponse> getChatHistory(@PathVariable Long gameId) {
        ChatHistoryResponse chatHistory = chatService.getChatHistory(gameId);
        return ResponseEntity.ok(chatHistory);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }
}
