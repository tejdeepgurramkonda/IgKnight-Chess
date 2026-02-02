package com.igknight.game.engine;

public enum PieceType {
    PAWN("P", 1),
    KNIGHT("N", 3),
    BISHOP("B", 3),
    ROOK("R", 5),
    QUEEN("Q", 9),
    KING("K", 1000);

    private final String notation;
    private final int value;

    PieceType(String notation, int value) {
        this.notation = notation;
        this.value = value;
    }

    public String getNotation() {
        return notation;
    }

    public int getValue() {
        return value;
    }

    public static PieceType fromNotation(String notation) {
        for (PieceType type : values()) {
            if (type.notation.equals(notation)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Invalid piece notation: " + notation);
    }
}
