package com.igknight.game.engine;

import java.util.Objects;

public class Move {
    private final Position from;
    private final Position to;
    private final PieceType promotionPiece;
    private final boolean isCapture;
    private final boolean isCastling;
    private final boolean isEnPassant;

    public Move(Position from, Position to) {
        this(from, to, null, false, false, false);
    }

    public Move(Position from, Position to, PieceType promotionPiece) {
        this(from, to, promotionPiece, false, false, false);
    }

    public Move(Position from, Position to, PieceType promotionPiece, boolean isCapture, boolean isCastling, boolean isEnPassant) {
        this.from = from;
        this.to = to;
        this.promotionPiece = promotionPiece;
        this.isCapture = isCapture;
        this.isCastling = isCastling;
        this.isEnPassant = isEnPassant;
    }

    public Position getFrom() {
        return from;
    }

    public Position getTo() {
        return to;
    }

    public PieceType getPromotionPiece() {
        return promotionPiece;
    }

    public boolean isCapture() {
        return isCapture;
    }

    public boolean isCastling() {
        return isCastling;
    }

    public boolean isEnPassant() {
        return isEnPassant;
    }

    public boolean isPromotion() {
        return promotionPiece != null;
    }

    public String toAlgebraic() {
        return from.toAlgebraic() + to.toAlgebraic() + (promotionPiece != null ? promotionPiece.getNotation().toLowerCase() : "");
    }

    public static Move fromAlgebraic(String notation) {
        if (notation.length() < 4) {
            throw new IllegalArgumentException("Invalid move notation: " + notation);
        }
        Position from = Position.fromAlgebraic(notation.substring(0, 2));
        Position to = Position.fromAlgebraic(notation.substring(2, 4));
        PieceType promotion = null;
        if (notation.length() == 5) {
            char promotionChar = Character.toUpperCase(notation.charAt(4));
            promotion = PieceType.fromNotation(String.valueOf(promotionChar));
        }
        return new Move(from, to, promotion);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Move move = (Move) o;
        return isCapture == move.isCapture &&
               isCastling == move.isCastling &&
               isEnPassant == move.isEnPassant &&
               Objects.equals(from, move.from) &&
               Objects.equals(to, move.to) &&
               promotionPiece == move.promotionPiece;
    }

    @Override
    public int hashCode() {
        return Objects.hash(from, to, promotionPiece, isCapture, isCastling, isEnPassant);
    }

    @Override
    public String toString() {
        return toAlgebraic();
    }
}
