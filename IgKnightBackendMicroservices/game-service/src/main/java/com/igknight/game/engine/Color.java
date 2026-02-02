package com.igknight.game.engine;

public enum Color {
    WHITE,
    BLACK;

    public Color opposite() {
        return this == WHITE ? BLACK : WHITE;
    }

    public int getDirection() {
        return this == WHITE ? 1 : -1;
    }

    public int getStartRank() {
        return this == WHITE ? 1 : 8;
    }

    public int getPawnStartRank() {
        return this == WHITE ? 2 : 7;
    }

    public int getPromotionRank() {
        return this == WHITE ? 8 : 1;
    }
}
