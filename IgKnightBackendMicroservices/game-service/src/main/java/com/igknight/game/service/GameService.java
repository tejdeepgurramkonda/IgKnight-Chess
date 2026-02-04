package com.igknight.game.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.igknight.game.client.RealtimeGameServiceClient;
import com.igknight.game.dto.CreateGameRequest;
import com.igknight.game.dto.GameResponse;
import com.igknight.game.dto.LegalMovesResponse;
import com.igknight.game.dto.MakeMoveRequest;
import com.igknight.game.engine.Board;
import com.igknight.game.engine.Color;
import com.igknight.game.engine.GameStatus;
import com.igknight.game.engine.Move;
import com.igknight.game.engine.Piece;
import com.igknight.game.engine.PieceType;
import com.igknight.game.engine.Position;
import com.igknight.game.entity.Game;
import com.igknight.game.entity.GameMove;
import com.igknight.game.exception.ForbiddenException;
import com.igknight.game.exception.ResourceAlreadyExistsException;
import com.igknight.game.repository.GameMoveRepository;
import com.igknight.game.repository.GameRepository;
import com.igknight.game.websocket.GameWebSocketService;

@Service
public class GameService {

    private final GameRepository gameRepository;
    private final GameMoveRepository gameMoveRepository;
    private final MoveValidator moveValidator;
    private final MoveGenerator moveGenerator;
    private final GameStateService gameStateService;
    private final GameWebSocketService webSocketService;
    private final RealtimeGameServiceClient realtimeGameServiceClient;

    public GameService(GameRepository gameRepository,
                      GameMoveRepository gameMoveRepository,
                      MoveValidator moveValidator,
                      MoveGenerator moveGenerator,
                      GameStateService gameStateService,
                      GameWebSocketService webSocketService,
                      RealtimeGameServiceClient realtimeGameServiceClient) {
        this.gameRepository = gameRepository;
        this.gameMoveRepository = gameMoveRepository;
        this.moveValidator = moveValidator;
        this.moveGenerator = moveGenerator;
        this.gameStateService = gameStateService;
        this.webSocketService = webSocketService;
        this.realtimeGameServiceClient = realtimeGameServiceClient;
    }

    @Transactional
    public GameResponse createGame(Long userId, String username, CreateGameRequest request) {
        // Check if user already has an active game
        List<GameStatus> activeStatuses = List.of(GameStatus.WAITING, GameStatus.IN_PROGRESS);
        List<Game> activeGames = gameRepository.findActiveGamesByUserId(userId, activeStatuses);
        if (!activeGames.isEmpty()) {
            // Auto-abandon old games if creating a matchmaking game (has rating flag)
            if (request.getIsRated() != null && request.getIsRated()) {
                for (Game oldGame : activeGames) {
                    // If old game is still WAITING (no opponent), delete it
                    if (oldGame.getStatus() == GameStatus.WAITING) {
                        gameRepository.delete(oldGame);
                    } else {
                        // If game is IN_PROGRESS, mark as ABANDONED
                        oldGame.setStatus(GameStatus.ABANDONED);
                        gameRepository.save(oldGame);
                    }
                }
            } else {
                throw new ResourceAlreadyExistsException("You already have an active game");
            }
        }

        // Try to find a waiting game created by another user with matching time control (matchmaking)
        Optional<Game> waitingGame;
        
        if (request.getTimeControl() != null) {
            // Find game with same time control
            waitingGame = gameRepository.findFirstWaitingGameByTimeControl(
                GameStatus.WAITING, 
                userId,
                request.getTimeControl(),
                request.getTimeIncrement() != null ? request.getTimeIncrement() : 0
            );
        } else {
            // Find game without time control (unlimited)
            waitingGame = gameRepository.findFirstWaitingGameWithoutTimeControl(GameStatus.WAITING, userId);
        }
        
        if (waitingGame.isPresent()) {
            // Join the existing waiting game instead of creating a new one
            try {
                return joinGame(waitingGame.get().getId(), userId, username);
            } catch (Exception e) {
                // If join fails (maybe another player joined simultaneously), create new game
                System.out.println("Failed to join waiting game, creating new one: " + e.getMessage());
            }
        }

        // No waiting games available with matching time control, create a new one
        Game game = new Game(userId, username);
        if (request.getTimeControl() != null) {
            game.setTimeControl(request.getTimeControl());
            game.setTimeIncrement(request.getTimeIncrement() != null ? request.getTimeIncrement() : 0);
        }
        if (request.getIsRated() != null) {
            game.setIsRated(request.getIsRated());
        }

        game = gameRepository.save(game);
        return mapToGameResponse(game);
    }

    @Transactional
    public GameResponse joinGame(Long gameId, Long userId, String username) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (game.getStatus() != GameStatus.WAITING) {
            throw new RuntimeException("Game is not available to join");
        }

        if (game.getWhitePlayerId().equals(userId)) {
            throw new RuntimeException("Cannot join your own game");
        }

        game.setBlackPlayerId(userId);
        game.setBlackPlayerUsername(username);
        game.setStatus(GameStatus.IN_PROGRESS);
        // Initialize server-side clocks when the game starts
        if (game.getTimeControl() != null) {
            ensureClockInitialization(game);
            game.setLastMoveAt(LocalDateTime.now());
        }
        game = gameRepository.save(game);

        // Notify both players that the game has started
        GameResponse gameResponse = mapToGameResponse(game);
        webSocketService.notifyGameStart(gameId, Map.of(
            "gameId", gameId,
            "status", "IN_PROGRESS",
            "game", gameResponse
        ));
        webSocketService.notifyGameUpdate(gameId, gameResponse);

        return gameResponse;
    }

    @Transactional
    public GameResponse makeMove(Long gameId, Long userId, MakeMoveRequest request) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            throw new RuntimeException("Game is not in progress");
        }

        if (!game.hasPlayer(userId)) {
            throw new RuntimeException("You are not a player in this game");
        }

        Color playerColor = game.getPlayerColor(userId);
        Board board = Board.fromFEN(game.getFenPosition());

        if (board.getCurrentTurn() != playerColor) {
            throw new RuntimeException("It's not your turn");
        }

        // Apply clock for the player about to move; if flagged, end immediately
        LocalDateTime now = LocalDateTime.now();
        if (game.getTimeControl() != null) {
            ensureClockInitialization(game);
            applyClockForCurrentPlayer(game, board.getCurrentTurn(), now);
            if (game.getStatus() == GameStatus.TIMEOUT) {
                game = gameRepository.save(game);
                GameResponse timedOut = mapToGameResponse(game);
                webSocketService.notifyGameUpdate(gameId, timedOut);
                webSocketService.notifyGameEnd(gameId, timedOut);
                return timedOut;
            }
        }

        // Parse move
        Position from = Position.fromAlgebraic(request.getFrom());
        Position to = Position.fromAlgebraic(request.getTo());
        PieceType promotion = null;
        if (request.getPromotion() != null && !request.getPromotion().isEmpty()) {
            promotion = PieceType.fromNotation(request.getPromotion());
        }

        Move move = new Move(from, to, promotion);

        // Validate move
        if (!moveValidator.validateMove(board, move)) {
            throw new RuntimeException("Invalid move");
        }

        // Get piece before making move
        Piece piece = board.getPiece(from);
        boolean wasCapture = board.getPiece(to) != null || move.isEnPassant();

        // Snapshot board for SAN generation
        Board boardBeforeMove = board.copy();

        // Execute move
        moveValidator.executeMove(board, move);

        // Update game state
        game.setFenPosition(board.toFEN());
        game.setCurrentTurn(board.getCurrentTurn());

        // Check game status
        GameStatus newStatus = gameStateService.determineGameStatus(board);
        if (newStatus != GameStatus.IN_PROGRESS) {
            game.setStatus(newStatus);
            if (newStatus == GameStatus.CHECKMATE) {
                game.setWinnerId(userId);
            }
        }

        // Apply increment after a successful move
        if (game.getTimeControl() != null && game.getTimeIncrement() != null && game.getTimeIncrement() > 0) {
            if (playerColor == Color.WHITE) {
                game.setWhiteTimeRemaining(game.getWhiteTimeRemaining() + game.getTimeIncrement());
            } else {
                game.setBlackTimeRemaining(game.getBlackTimeRemaining() + game.getTimeIncrement());
            }
        }

        // Start opponent's clock
        if (game.getTimeControl() != null) {
            game.setLastMoveAt(now);
        }

        // Record move
        GameMove gameMove = new GameMove();
        gameMove.setGame(game);
        gameMove.setMoveNumber(game.getMoves().size() + 1);
        gameMove.setPlayerColor(playerColor);
        gameMove.setFromSquare(request.getFrom());
        gameMove.setToSquare(request.getTo());
        gameMove.setPieceType(piece.getType().toString());
        gameMove.setPromotionPiece(promotion != null ? promotion.toString() : null);
        gameMove.setIsCapture(wasCapture);
        gameMove.setIsCastling(move.isCastling());
        gameMove.setIsEnPassant(move.isEnPassant());
        boolean isCheck = moveValidator.isKingInCheck(board, board.getCurrentTurn());
        gameMove.setIsCheck(isCheck);
        gameMove.setIsCheckmate(newStatus == GameStatus.CHECKMATE);
        gameMove.setFenAfterMove(board.toFEN());
        gameMove.setSanNotation(buildSanNotation(boardBeforeMove, move, wasCapture, isCheck, newStatus == GameStatus.CHECKMATE));

        gameMoveRepository.save(gameMove);
        game = gameRepository.save(game);

        // Send WebSocket notifications
        GameResponse gameResponse = mapToGameResponse(game);

        // Compact move payload for faster client updates
        Map<String, Object> movePayload = new HashMap<>();
        movePayload.put("gameId", gameId);
        movePayload.put("from", request.getFrom());
        movePayload.put("to", request.getTo());
        movePayload.put("san", gameMove.getSanNotation());
        if (movePayload.get("san") == null) {
            String fallbackSan = request.getFrom() + request.getTo();
            if (request.getPromotion() != null && !request.getPromotion().isBlank()) {
                fallbackSan += request.getPromotion();
            }
            movePayload.put("san", fallbackSan);
        }
        movePayload.put("fenAfterMove", gameMove.getFenAfterMove());
        movePayload.put("whiteTimeRemaining", game.getWhiteTimeRemaining());
        movePayload.put("blackTimeRemaining", game.getBlackTimeRemaining());
        movePayload.put("status", game.getStatus().toString());
        movePayload.put("currentTurn", game.getCurrentTurn().toString());
        movePayload.put("isCheck", isCheck);
        movePayload.put("isCheckmate", newStatus == GameStatus.CHECKMATE);

        webSocketService.notifyGameUpdate(gameId, gameResponse);
        webSocketService.notifyPlayerMove(gameId, movePayload);
        
        // Notify realtime service for WebSocket broadcasting
        realtimeGameServiceClient.notifyMove(gameId, gameResponse);
        
        // If game ended, notify
        if (newStatus != GameStatus.IN_PROGRESS) {
            webSocketService.notifyGameEnd(gameId, gameResponse);
        }

        return gameResponse;
    }

    public GameResponse getGame(Long gameId, Long userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));
        
        // AUTHORIZATION: Only players in the game can access it
        if (!game.hasPlayer(userId)) {
            throw new ForbiddenException("You are not a player in this game");
        }
        
        return mapToGameResponse(game);
    }

    public List<GameResponse> getUserGames(Long userId) {
        List<Game> games = gameRepository.findAllGamesByUserId(userId);
        return games.stream()
                .map(this::mapToGameResponse)
                .collect(Collectors.toList());
    }

    public List<GameResponse> getActiveGames(Long userId) {
        List<GameStatus> activeStatuses = List.of(GameStatus.WAITING, GameStatus.IN_PROGRESS);
        List<Game> games = gameRepository.findActiveGamesByUserId(userId, activeStatuses);
        return games.stream()
                .map(this::mapToGameResponse)
                .collect(Collectors.toList());
    }

    public LegalMovesResponse getLegalMoves(Long gameId, String square, Long userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        // AUTHORIZATION: Only players in the game can request legal moves
        if (!game.hasPlayer(userId)) {
            throw new ForbiddenException("You are not a player in this game");
        }

        Board board = Board.fromFEN(game.getFenPosition());
        Position position = Position.fromAlgebraic(square);

        List<Move> legalMoves = moveValidator.generateLegalMovesForPiece(board, position);
        List<String> moveStrings = legalMoves.stream()
                .map(move -> move.getTo().toAlgebraic())
                .collect(Collectors.toList());

        return new LegalMovesResponse(square, moveStrings);
    }

    @Transactional
    public GameResponse resignGame(Long gameId, Long userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        // AUTHORIZATION: Only players in the game can resign
        if (!game.hasPlayer(userId)) {
            throw new ForbiddenException("You are not a player in this game");
        }

        if (game.isGameOver()) {
            throw new RuntimeException("Game is already over");
        }

        // If game is still waiting, just delete it instead of marking as resignation
        if (game.getStatus() == GameStatus.WAITING) {
            gameRepository.delete(game);
            return null;
        }

        // Set game status to RESIGNATION
        game.setStatus(GameStatus.RESIGNATION);
        
        // Winner is the opponent (the player who didn't resign)
        Long winnerId = game.getWhitePlayerId().equals(userId) ?
                (game.getBlackPlayerId() != null ? game.getBlackPlayerId() : null) :
                game.getWhitePlayerId();
        game.setWinnerId(winnerId);
        
        // Set the end time
        game.setEndedAt(LocalDateTime.now());

        game = gameRepository.save(game);
        
        GameResponse response = mapToGameResponse(game);
        
        // Log resignation for debugging
        System.out.println("Player " + userId + " resigned from game " + gameId + ". Winner: " + winnerId);
        
        return response;
    }

    private void ensureClockInitialization(Game game) {
        if (game.getTimeControl() == null) {
            return;
        }
        if (game.getWhiteTimeRemaining() == null) {
            game.setWhiteTimeRemaining(game.getTimeControl());
        }
        if (game.getBlackTimeRemaining() == null) {
            game.setBlackTimeRemaining(game.getTimeControl());
        }
    }

    private void applyClockForCurrentPlayer(Game game, Color currentTurn, LocalDateTime now) {
        if (game.getTimeControl() == null) {
            return;
        }

        if (game.getLastMoveAt() == null) {
            game.setLastMoveAt(now);
            return;
        }

        long elapsedSeconds = Duration.between(game.getLastMoveAt(), now).getSeconds();
        if (elapsedSeconds < 0) {
            elapsedSeconds = 0;
        }

        if (currentTurn == Color.WHITE) {
            int remaining = game.getWhiteTimeRemaining() - (int) elapsedSeconds;
            game.setWhiteTimeRemaining(Math.max(remaining, 0));
            if (remaining <= 0) {
                game.setStatus(GameStatus.TIMEOUT);
                game.setWinnerId(game.getBlackPlayerId());
            }
        } else {
            int remaining = game.getBlackTimeRemaining() - (int) elapsedSeconds;
            game.setBlackTimeRemaining(Math.max(remaining, 0));
            if (remaining <= 0) {
                game.setStatus(GameStatus.TIMEOUT);
                game.setWinnerId(game.getWhitePlayerId());
            }
        }
    }

    private String buildSanNotation(Board boardBeforeMove, Move move, boolean wasCapture, boolean isCheck, boolean isCheckmate) {
        Piece movingPiece = boardBeforeMove.getPiece(move.getFrom());
        if (movingPiece == null) {
            return move.toAlgebraic();
        }

        // Castling
        if (move.isCastling()) {
            return move.getTo().getFile() == 7 ? "O-O" : "O-O-O";
        }

        StringBuilder san = new StringBuilder();
        if (movingPiece.getType() != PieceType.PAWN) {
            san.append(movingPiece.getType().getNotation());
        } else if (wasCapture) {
            // For pawn captures, include file of origin
            char fileChar = (char) ('a' + move.getFrom().getFile() - 1);
            san.append(fileChar);
        }

        if (wasCapture) {
            san.append('x');
        }

        san.append(move.getTo().toAlgebraic());

        if (move.isPromotion()) {
            san.append('=').append(move.getPromotionPiece().getNotation());
        }

        if (isCheckmate) {
            san.append('#');
        } else if (isCheck) {
            san.append('+');
        }

        return san.toString();
    }

    private GameResponse mapToGameResponse(Game game) {
        GameResponse response = new GameResponse();
        response.setId(game.getId());

        response.setWhitePlayer(new GameResponse.PlayerInfo(
                game.getWhitePlayerId(),
                game.getWhitePlayerUsername()
        ));

        if (game.getBlackPlayerId() != null) {
            response.setBlackPlayer(new GameResponse.PlayerInfo(
                    game.getBlackPlayerId(),
                    game.getBlackPlayerUsername()
            ));
        }

        response.setFenPosition(game.getFenPosition());
        response.setCurrentTurn(game.getCurrentTurn().toString());
        response.setStatus(game.getStatus().toString());
        response.setWinnerId(game.getWinnerId());
        response.setWhiteTimeRemaining(game.getWhiteTimeRemaining());
        response.setBlackTimeRemaining(game.getBlackTimeRemaining());
        response.setTimeControl(game.getTimeControl());
        response.setTimeIncrement(game.getTimeIncrement());
        response.setIsRated(game.getIsRated());
        response.setCreatedAt(game.getCreatedAt());
        response.setUpdatedAt(game.getUpdatedAt());
        response.setEndedAt(game.getEndedAt());

        // Check if king is in check
        Board board = Board.fromFEN(game.getFenPosition());
        response.setIsCheck(moveValidator.isKingInCheck(board, board.getCurrentTurn()));

        // Map moves
        List<GameResponse.MoveInfo> moveInfos = new ArrayList<>();
        for (GameMove move : game.getMoves()) {
            GameResponse.MoveInfo moveInfo = new GameResponse.MoveInfo();
            moveInfo.setMoveNumber(move.getMoveNumber());
            moveInfo.setFrom(move.getFromSquare());
            moveInfo.setTo(move.getToSquare());
            moveInfo.setPiece(move.getPieceType());
            String san = move.getSanNotation();
            if (san == null || san.isBlank()) {
                san = move.getFromSquare() + move.getToSquare();
                if (move.getPromotionPiece() != null) {
                    san = san + move.getPromotionPiece().charAt(0);
                }
            }
            moveInfo.setSan(san);
            moveInfo.setResultingFen(move.getFenAfterMove());
            moveInfo.setIsCapture(move.getIsCapture());
            moveInfo.setIsCheck(move.getIsCheck());
            moveInfo.setIsCheckmate(move.getIsCheckmate());
            moveInfos.add(moveInfo);
        }
        response.setMoves(moveInfos);

        return response;
    }
}
