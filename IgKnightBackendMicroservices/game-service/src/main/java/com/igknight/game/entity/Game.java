package com.igknight.game.entity;

import com.igknight.game.engine.Color;
import com.igknight.game.engine.GameStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chess_games", indexes = {
    @Index(name = "idx_game_status", columnList = "status"),
    @Index(name = "idx_white_player", columnList = "white_player_id"),
    @Index(name = "idx_black_player", columnList = "black_player_id"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "white_player_id", nullable = false)
    private Long whitePlayerId;

    @Column(name = "white_player_username")
    private String whitePlayerUsername;

    @Column(name = "black_player_id")
    private Long blackPlayerId;

    @Column(name = "black_player_username")
    private String blackPlayerUsername;

    @Column(name = "fen_position", nullable = false, length = 100)
    private String fenPosition;

    @Column(name = "pgn_moves", columnDefinition = "TEXT")
    private String pgnMoves;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_turn", nullable = false, length = 10)
    private Color currentTurn;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private GameStatus status;

    @Column(name = "winner_id")
    private Long winnerId;

    @Column(name = "white_time_remaining")
    private Integer whiteTimeRemaining;

    @Column(name = "black_time_remaining")
    private Integer blackTimeRemaining;

    @Column(name = "time_control")
    private Integer timeControl; // in seconds

    @Column(name = "time_increment")
    private Integer timeIncrement; // in seconds

    @Column(name = "last_move_at")
    private LocalDateTime lastMoveAt;

    @Column(name = "is_rated")
    private Boolean isRated = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("move_number ASC")
    private List<GameMove> moves = new ArrayList<>();

    // Constructors
    public Game() {
        this.fenPosition = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        this.pgnMoves = "";
        this.currentTurn = Color.WHITE;
        this.status = GameStatus.WAITING;
    }

    public Game(Long whitePlayerId, String whitePlayerUsername) {
        this();
        this.whitePlayerId = whitePlayerId;
        this.whitePlayerUsername = whitePlayerUsername;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getWhitePlayerId() {
        return whitePlayerId;
    }

    public void setWhitePlayerId(Long whitePlayerId) {
        this.whitePlayerId = whitePlayerId;
    }

    public String getWhitePlayerUsername() {
        return whitePlayerUsername;
    }

    public void setWhitePlayerUsername(String whitePlayerUsername) {
        this.whitePlayerUsername = whitePlayerUsername;
    }

    public Long getBlackPlayerId() {
        return blackPlayerId;
    }

    public void setBlackPlayerId(Long blackPlayerId) {
        this.blackPlayerId = blackPlayerId;
    }

    public String getBlackPlayerUsername() {
        return blackPlayerUsername;
    }

    public void setBlackPlayerUsername(String blackPlayerUsername) {
        this.blackPlayerUsername = blackPlayerUsername;
    }

    public String getFenPosition() {
        return fenPosition;
    }

    public void setFenPosition(String fenPosition) {
        this.fenPosition = fenPosition;
    }

    public String getPgnMoves() {
        return pgnMoves;
    }

    public void setPgnMoves(String pgnMoves) {
        this.pgnMoves = pgnMoves;
    }

    public Color getCurrentTurn() {
        return currentTurn;
    }

    public void setCurrentTurn(Color currentTurn) {
        this.currentTurn = currentTurn;
    }

    public GameStatus getStatus() {
        return status;
    }

    public void setStatus(GameStatus status) {
        this.status = status;
        if (status != GameStatus.IN_PROGRESS && status != GameStatus.WAITING && this.endedAt == null) {
            this.endedAt = LocalDateTime.now();
        }
    }

    public Long getWinnerId() {
        return winnerId;
    }

    public void setWinnerId(Long winnerId) {
        this.winnerId = winnerId;
    }

    public Integer getWhiteTimeRemaining() {
        return whiteTimeRemaining;
    }

    public void setWhiteTimeRemaining(Integer whiteTimeRemaining) {
        this.whiteTimeRemaining = whiteTimeRemaining;
    }

    public Integer getBlackTimeRemaining() {
        return blackTimeRemaining;
    }

    public void setBlackTimeRemaining(Integer blackTimeRemaining) {
        this.blackTimeRemaining = blackTimeRemaining;
    }

    public Integer getTimeControl() {
        return timeControl;
    }

    public void setTimeControl(Integer timeControl) {
        this.timeControl = timeControl;
        this.whiteTimeRemaining = timeControl;
        this.blackTimeRemaining = timeControl;
    }

    public Integer getTimeIncrement() {
        return timeIncrement;
    }

    public void setTimeIncrement(Integer timeIncrement) {
        this.timeIncrement = timeIncrement;
    }

    public LocalDateTime getLastMoveAt() {
        return lastMoveAt;
    }

    public void setLastMoveAt(LocalDateTime lastMoveAt) {
        this.lastMoveAt = lastMoveAt;
    }

    public Boolean getIsRated() {
        return isRated;
    }

    public void setIsRated(Boolean isRated) {
        this.isRated = isRated;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public List<GameMove> getMoves() {
        return moves;
    }

    public void setMoves(List<GameMove> moves) {
        this.moves = moves;
    }

    public void addMove(GameMove move) {
        moves.add(move);
        move.setGame(this);
    }

    public boolean isGameOver() {
        return status != GameStatus.IN_PROGRESS && status != GameStatus.WAITING;
    }

    public boolean hasPlayer(Long userId) {
        return (whitePlayerId != null && whitePlayerId.equals(userId)) ||
               (blackPlayerId != null && blackPlayerId.equals(userId));
    }

    public Color getPlayerColor(Long userId) {
        if (whitePlayerId != null && whitePlayerId.equals(userId)) {
            return Color.WHITE;
        } else if (blackPlayerId != null && blackPlayerId.equals(userId)) {
            return Color.BLACK;
        }
        return null;
    }
}
