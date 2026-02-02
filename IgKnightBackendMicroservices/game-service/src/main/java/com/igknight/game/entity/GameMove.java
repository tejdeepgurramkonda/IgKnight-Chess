package com.igknight.game.entity;

import com.igknight.game.engine.Color;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chess_moves", indexes = {
    @Index(name = "idx_game_move", columnList = "game_id, move_number")
})
public class GameMove {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "move_number", nullable = false)
    private Integer moveNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "player_color", nullable = false, length = 10)
    private Color playerColor;

    @Column(name = "from_square", nullable = false, length = 2)
    private String fromSquare;

    @Column(name = "to_square", nullable = false, length = 2)
    private String toSquare;

    @Column(name = "piece_type", nullable = false, length = 10)
    private String pieceType;

    @Column(name = "promotion_piece", length = 10)
    private String promotionPiece;

    @Column(name = "is_capture")
    private Boolean isCapture = false;

    @Column(name = "is_check")
    private Boolean isCheck = false;

    @Column(name = "is_checkmate")
    private Boolean isCheckmate = false;

    @Column(name = "is_castling")
    private Boolean isCastling = false;

    @Column(name = "is_en_passant")
    private Boolean isEnPassant = false;

    @Column(name = "san_notation", length = 10)
    private String sanNotation; // Standard Algebraic Notation (e.g., "Nf3", "exd5")

    @Column(name = "fen_after_move", length = 100)
    private String fenAfterMove;

    @Column(name = "time_taken")
    private Integer timeTaken; // in milliseconds

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Constructors
    public GameMove() {}

    public GameMove(Game game, Integer moveNumber, Color playerColor, String fromSquare, String toSquare, String pieceType) {
        this.game = game;
        this.moveNumber = moveNumber;
        this.playerColor = playerColor;
        this.fromSquare = fromSquare;
        this.toSquare = toSquare;
        this.pieceType = pieceType;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Game getGame() {
        return game;
    }

    public void setGame(Game game) {
        this.game = game;
    }

    public Integer getMoveNumber() {
        return moveNumber;
    }

    public void setMoveNumber(Integer moveNumber) {
        this.moveNumber = moveNumber;
    }

    public Color getPlayerColor() {
        return playerColor;
    }

    public void setPlayerColor(Color playerColor) {
        this.playerColor = playerColor;
    }

    public String getFromSquare() {
        return fromSquare;
    }

    public void setFromSquare(String fromSquare) {
        this.fromSquare = fromSquare;
    }

    public String getToSquare() {
        return toSquare;
    }

    public void setToSquare(String toSquare) {
        this.toSquare = toSquare;
    }

    public String getPieceType() {
        return pieceType;
    }

    public void setPieceType(String pieceType) {
        this.pieceType = pieceType;
    }

    public String getPromotionPiece() {
        return promotionPiece;
    }

    public void setPromotionPiece(String promotionPiece) {
        this.promotionPiece = promotionPiece;
    }

    public Boolean getIsCapture() {
        return isCapture;
    }

    public void setIsCapture(Boolean isCapture) {
        this.isCapture = isCapture;
    }

    public Boolean getIsCheck() {
        return isCheck;
    }

    public void setIsCheck(Boolean isCheck) {
        this.isCheck = isCheck;
    }

    public Boolean getIsCheckmate() {
        return isCheckmate;
    }

    public void setIsCheckmate(Boolean isCheckmate) {
        this.isCheckmate = isCheckmate;
    }

    public Boolean getIsCastling() {
        return isCastling;
    }

    public void setIsCastling(Boolean isCastling) {
        this.isCastling = isCastling;
    }

    public Boolean getIsEnPassant() {
        return isEnPassant;
    }

    public void setIsEnPassant(Boolean isEnPassant) {
        this.isEnPassant = isEnPassant;
    }

    public String getSanNotation() {
        return sanNotation;
    }

    public void setSanNotation(String sanNotation) {
        this.sanNotation = sanNotation;
    }

    public String getFenAfterMove() {
        return fenAfterMove;
    }

    public void setFenAfterMove(String fenAfterMove) {
        this.fenAfterMove = fenAfterMove;
    }

    public Integer getTimeTaken() {
        return timeTaken;
    }

    public void setTimeTaken(Integer timeTaken) {
        this.timeTaken = timeTaken;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
