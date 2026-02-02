package com.igknight.game.engine;

import java.util.Objects;

public class Position {
    private final int rank; // 1-8
    private final int file; // 1-8 (a-h)

    public Position(int rank, int file) {
        if (rank < 1 || rank > 8 || file < 1 || file > 8) {
            throw new IllegalArgumentException("Invalid position: rank=" + rank + ", file=" + file);
        }
        this.rank = rank;
        this.file = file;
    }

    public static Position fromAlgebraic(String notation) {
        if (notation == null || notation.length() != 2) {
            throw new IllegalArgumentException("Invalid algebraic notation: " + notation);
        }
        char fileChar = notation.charAt(0);
        char rankChar = notation.charAt(1);
        
        if (fileChar < 'a' || fileChar > 'h' || rankChar < '1' || rankChar > '8') {
            throw new IllegalArgumentException("Invalid algebraic notation: " + notation);
        }
        
        int file = fileChar - 'a' + 1;
        int rank = rankChar - '0';
        return new Position(rank, file);
    }

    public String toAlgebraic() {
        char fileChar = (char) ('a' + file - 1);
        return "" + fileChar + rank;
    }

    public int getRank() {
        return rank;
    }

    public int getFile() {
        return file;
    }

    public boolean isValid() {
        return rank >= 1 && rank <= 8 && file >= 1 && file <= 8;
    }

    public Position move(int rankDelta, int fileDelta) {
        int newRank = rank + rankDelta;
        int newFile = file + fileDelta;
        if (newRank < 1 || newRank > 8 || newFile < 1 || newFile > 8) {
            return null;
        }
        return new Position(newRank, newFile);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Position position = (Position) o;
        return rank == position.rank && file == position.file;
    }

    @Override
    public int hashCode() {
        return Objects.hash(rank, file);
    }

    @Override
    public String toString() {
        return toAlgebraic();
    }
}
