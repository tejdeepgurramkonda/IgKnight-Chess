package com.igknight.game.engine;

import java.util.ArrayList;
import java.util.List;

public class Board {
    private final Piece[][] squares;
    private Color currentTurn;
    private Position enPassantTarget;
    private boolean whiteCanCastleKingside;
    private boolean whiteCanCastleQueenside;
    private boolean blackCanCastleKingside;
    private boolean blackCanCastleQueenside;
    private int halfMoveClock;
    private int fullMoveNumber;
    private final List<String> positionHistory;

    public Board() {
        this.squares = new Piece[8][8];
        this.currentTurn = Color.WHITE;
        this.enPassantTarget = null;
        this.whiteCanCastleKingside = true;
        this.whiteCanCastleQueenside = true;
        this.blackCanCastleKingside = true;
        this.blackCanCastleQueenside = true;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.positionHistory = new ArrayList<>();
        initializeStandardPosition();
    }

    private void initializeStandardPosition() {
        // White pieces
        setPiece(new Position(1, 1), new Piece(PieceType.ROOK, Color.WHITE));
        setPiece(new Position(1, 2), new Piece(PieceType.KNIGHT, Color.WHITE));
        setPiece(new Position(1, 3), new Piece(PieceType.BISHOP, Color.WHITE));
        setPiece(new Position(1, 4), new Piece(PieceType.QUEEN, Color.WHITE));
        setPiece(new Position(1, 5), new Piece(PieceType.KING, Color.WHITE));
        setPiece(new Position(1, 6), new Piece(PieceType.BISHOP, Color.WHITE));
        setPiece(new Position(1, 7), new Piece(PieceType.KNIGHT, Color.WHITE));
        setPiece(new Position(1, 8), new Piece(PieceType.ROOK, Color.WHITE));
        for (int file = 1; file <= 8; file++) {
            setPiece(new Position(2, file), new Piece(PieceType.PAWN, Color.WHITE));
        }

        // Black pieces
        setPiece(new Position(8, 1), new Piece(PieceType.ROOK, Color.BLACK));
        setPiece(new Position(8, 2), new Piece(PieceType.KNIGHT, Color.BLACK));
        setPiece(new Position(8, 3), new Piece(PieceType.BISHOP, Color.BLACK));
        setPiece(new Position(8, 4), new Piece(PieceType.QUEEN, Color.BLACK));
        setPiece(new Position(8, 5), new Piece(PieceType.KING, Color.BLACK));
        setPiece(new Position(8, 6), new Piece(PieceType.BISHOP, Color.BLACK));
        setPiece(new Position(8, 7), new Piece(PieceType.KNIGHT, Color.BLACK));
        setPiece(new Position(8, 8), new Piece(PieceType.ROOK, Color.BLACK));
        for (int file = 1; file <= 8; file++) {
            setPiece(new Position(7, file), new Piece(PieceType.PAWN, Color.BLACK));
        }
    }

    public Piece getPiece(Position position) {
        if (position == null || !position.isValid()) {
            return null;
        }
        return squares[position.getRank() - 1][position.getFile() - 1];
    }

    public void setPiece(Position position, Piece piece) {
        if (position != null && position.isValid()) {
            squares[position.getRank() - 1][position.getFile() - 1] = piece;
        }
    }

    public void removePiece(Position position) {
        setPiece(position, null);
    }

    public Color getCurrentTurn() {
        return currentTurn;
    }

    public void setCurrentTurn(Color turn) {
        this.currentTurn = turn;
    }

    public Position getEnPassantTarget() {
        return enPassantTarget;
    }

    public void setEnPassantTarget(Position target) {
        this.enPassantTarget = target;
    }

    public boolean canCastleKingside(Color color) {
        return color == Color.WHITE ? whiteCanCastleKingside : blackCanCastleKingside;
    }

    public boolean canCastleQueenside(Color color) {
        return color == Color.WHITE ? whiteCanCastleQueenside : blackCanCastleQueenside;
    }

    public void setCastlingRights(Color color, boolean kingside, boolean queenside) {
        if (color == Color.WHITE) {
            whiteCanCastleKingside = kingside;
            whiteCanCastleQueenside = queenside;
        } else {
            blackCanCastleKingside = kingside;
            blackCanCastleQueenside = queenside;
        }
    }

    public int getHalfMoveClock() {
        return halfMoveClock;
    }

    public void setHalfMoveClock(int clock) {
        this.halfMoveClock = clock;
    }

    public int getFullMoveNumber() {
        return fullMoveNumber;
    }

    public void setFullMoveNumber(int number) {
        this.fullMoveNumber = number;
    }

    public void incrementHalfMoveClock() {
        halfMoveClock++;
    }

    public void resetHalfMoveClock() {
        halfMoveClock = 0;
    }

    public void incrementFullMoveNumber() {
        fullMoveNumber++;
    }

    public Position findKing(Color color) {
        for (int rank = 1; rank <= 8; rank++) {
            for (int file = 1; file <= 8; file++) {
                Position pos = new Position(rank, file);
                Piece piece = getPiece(pos);
                if (piece != null && piece.getType() == PieceType.KING && piece.getColor() == color) {
                    return pos;
                }
            }
        }
        return null;
    }

    public List<Position> getAllPiecesPositions(Color color) {
        List<Position> positions = new ArrayList<>();
        for (int rank = 1; rank <= 8; rank++) {
            for (int file = 1; file <= 8; file++) {
                Position pos = new Position(rank, file);
                Piece piece = getPiece(pos);
                if (piece != null && piece.getColor() == color) {
                    positions.add(pos);
                }
            }
        }
        return positions;
    }

    public void addToPositionHistory(String fenPosition) {
        positionHistory.add(fenPosition);
    }

    public int countPositionOccurrences(String fenPosition) {
        return (int) positionHistory.stream().filter(pos -> pos.equals(fenPosition)).count();
    }

    public Board copy() {
        Board newBoard = new Board();
        // Clear the new board
        for (int rank = 1; rank <= 8; rank++) {
            for (int file = 1; file <= 8; file++) {
                newBoard.removePiece(new Position(rank, file));
            }
        }
        // Copy all pieces
        for (int rank = 1; rank <= 8; rank++) {
            for (int file = 1; file <= 8; file++) {
                Position pos = new Position(rank, file);
                Piece piece = getPiece(pos);
                if (piece != null) {
                    newBoard.setPiece(pos, piece.copy());
                }
            }
        }
        newBoard.currentTurn = this.currentTurn;
        newBoard.enPassantTarget = this.enPassantTarget;
        newBoard.whiteCanCastleKingside = this.whiteCanCastleKingside;
        newBoard.whiteCanCastleQueenside = this.whiteCanCastleQueenside;
        newBoard.blackCanCastleKingside = this.blackCanCastleKingside;
        newBoard.blackCanCastleQueenside = this.blackCanCastleQueenside;
        newBoard.halfMoveClock = this.halfMoveClock;
        newBoard.fullMoveNumber = this.fullMoveNumber;
        newBoard.positionHistory.addAll(this.positionHistory);
        return newBoard;
    }

    public String toFEN() {
        StringBuilder fen = new StringBuilder();
        
        // Piece placement
        for (int rank = 8; rank >= 1; rank--) {
            int emptyCount = 0;
            for (int file = 1; file <= 8; file++) {
                Piece piece = getPiece(new Position(rank, file));
                if (piece == null) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen.append(emptyCount);
                        emptyCount = 0;
                    }
                    fen.append(piece.toFEN());
                }
            }
            if (emptyCount > 0) {
                fen.append(emptyCount);
            }
            if (rank > 1) {
                fen.append("/");
            }
        }

        // Active color
        fen.append(" ").append(currentTurn == Color.WHITE ? "w" : "b");

        // Castling rights
        fen.append(" ");
        StringBuilder castling = new StringBuilder();
        if (whiteCanCastleKingside) castling.append("K");
        if (whiteCanCastleQueenside) castling.append("Q");
        if (blackCanCastleKingside) castling.append("k");
        if (blackCanCastleQueenside) castling.append("q");
        fen.append(castling.length() > 0 ? castling.toString() : "-");

        // En passant target
        fen.append(" ").append(enPassantTarget != null ? enPassantTarget.toAlgebraic() : "-");

        // Halfmove clock and fullmove number
        fen.append(" ").append(halfMoveClock).append(" ").append(fullMoveNumber);

        return fen.toString();
    }

    public static Board fromFEN(String fen) {
        Board board = new Board();
        // Clear the board
        for (int rank = 1; rank <= 8; rank++) {
            for (int file = 1; file <= 8; file++) {
                board.removePiece(new Position(rank, file));
            }
        }

        String[] parts = fen.trim().split("\\s+");
        if (parts.length < 4) {
            throw new IllegalArgumentException("Invalid FEN string");
        }

        // Parse piece placement
        String[] ranks = parts[0].split("/");
        for (int i = 0; i < ranks.length; i++) {
            int rank = 8 - i;
            int file = 1;
            for (char c : ranks[i].toCharArray()) {
                if (Character.isDigit(c)) {
                    file += Character.getNumericValue(c);
                } else {
                    Piece piece = Piece.fromFEN(c);
                    board.setPiece(new Position(rank, file), piece);
                    file++;
                }
            }
        }

        // Parse active color
        board.currentTurn = parts[1].equals("w") ? Color.WHITE : Color.BLACK;

        // Parse castling rights
        board.whiteCanCastleKingside = parts[2].contains("K");
        board.whiteCanCastleQueenside = parts[2].contains("Q");
        board.blackCanCastleKingside = parts[2].contains("k");
        board.blackCanCastleQueenside = parts[2].contains("q");

        // Parse en passant target
        if (!parts[3].equals("-")) {
            board.enPassantTarget = Position.fromAlgebraic(parts[3]);
        }

        // Parse halfmove clock and fullmove number
        if (parts.length >= 5) {
            board.halfMoveClock = Integer.parseInt(parts[4]);
        }
        if (parts.length >= 6) {
            board.fullMoveNumber = Integer.parseInt(parts[5]);
        }

        return board;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("  a b c d e f g h\n");
        for (int rank = 8; rank >= 1; rank--) {
            sb.append(rank).append(" ");
            for (int file = 1; file <= 8; file++) {
                Piece piece = getPiece(new Position(rank, file));
                if (piece == null) {
                    sb.append(". ");
                } else {
                    sb.append(piece.toFEN()).append(" ");
                }
            }
            sb.append(rank).append("\n");
        }
        sb.append("  a b c d e f g h\n");
        return sb.toString();
    }
}
