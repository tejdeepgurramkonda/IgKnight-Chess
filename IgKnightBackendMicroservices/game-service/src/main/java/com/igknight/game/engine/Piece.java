package com.igknight.game.engine;

import java.util.Objects;

public class Piece {
    private final PieceType type;
    private final Color color;
    private boolean hasMoved;

    public Piece(PieceType type, Color color) {
        this.type = type;
        this.color = color;
        this.hasMoved = false;
    }

    public Piece(PieceType type, Color color, boolean hasMoved) {
        this.type = type;
        this.color = color;
        this.hasMoved = hasMoved;
    }

    public PieceType getType() {
        return type;
    }

    public Color getColor() {
        return color;
    }

    public boolean hasMoved() {
        return hasMoved;
    }

    public void setMoved(boolean moved) {
        this.hasMoved = moved;
    }

    public String toFEN() {
        String notation = type.getNotation();
        return color == Color.WHITE ? notation : notation.toLowerCase();
    }

    public static Piece fromFEN(char fenChar) {
        boolean isWhite = Character.isUpperCase(fenChar);
        Color color = isWhite ? Color.WHITE : Color.BLACK;
        String notation = String.valueOf(Character.toUpperCase(fenChar));
        PieceType type = PieceType.fromNotation(notation);
        return new Piece(type, color);
    }

    public Piece copy() {
        return new Piece(type, color, hasMoved);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Piece piece = (Piece) o;
        return hasMoved == piece.hasMoved && type == piece.type && color == piece.color;
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, color, hasMoved);
    }

    @Override
    public String toString() {
        return color + " " + type;
    }
}
