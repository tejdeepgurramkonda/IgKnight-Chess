package com.igknight.game.service;

import com.igknight.game.engine.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class GameStateService {

    private final MoveValidator moveValidator;

    public GameStateService(MoveValidator moveValidator) {
        this.moveValidator = moveValidator;
    }

    public boolean isCheckmate(Board board, Color color) {
        // Must be in check
        if (!moveValidator.isKingInCheck(board, color)) {
            return false;
        }

        // No legal moves available
        return !hasLegalMoves(board, color);
    }

    public boolean isStalemate(Board board, Color color) {
        // Must NOT be in check
        if (moveValidator.isKingInCheck(board, color)) {
            return false;
        }

        // No legal moves available
        return !hasLegalMoves(board, color);
    }

    public boolean hasLegalMoves(Board board, Color color) {
        List<Move> legalMoves = moveValidator.generateLegalMoves(board, color);
        return !legalMoves.isEmpty();
    }

    public boolean isDrawByFiftyMoveRule(Board board) {
        return board.getHalfMoveClock() >= 100; // 50 moves = 100 half-moves
    }

    public boolean isDrawByThreefoldRepetition(Board board) {
        String currentPosition = board.toFEN().split(" ")[0]; // Only piece placement part
        return board.countPositionOccurrences(currentPosition) >= 3;
    }

    public boolean isDrawByInsufficientMaterial(Board board) {
        List<Position> whitePieces = board.getAllPiecesPositions(Color.WHITE);
        List<Position> blackPieces = board.getAllPiecesPositions(Color.BLACK);

        // King vs King
        if (whitePieces.size() == 1 && blackPieces.size() == 1) {
            return true;
        }

        // King and Bishop vs King
        // King and Knight vs King
        if (whitePieces.size() == 2 && blackPieces.size() == 1) {
            Piece piece = findNonKingPiece(board, whitePieces);
            if (piece != null && (piece.getType() == PieceType.BISHOP || piece.getType() == PieceType.KNIGHT)) {
                return true;
            }
        }

        if (whitePieces.size() == 1 && blackPieces.size() == 2) {
            Piece piece = findNonKingPiece(board, blackPieces);
            if (piece != null && (piece.getType() == PieceType.BISHOP || piece.getType() == PieceType.KNIGHT)) {
                return true;
            }
        }

        // King and Bishop vs King and Bishop (same color square)
        if (whitePieces.size() == 2 && blackPieces.size() == 2) {
            Piece whitePiece = findNonKingPiece(board, whitePieces);
            Piece blackPiece = findNonKingPiece(board, blackPieces);

            if (whitePiece != null && blackPiece != null &&
                whitePiece.getType() == PieceType.BISHOP &&
                blackPiece.getType() == PieceType.BISHOP) {

                Position whitePos = findPiecePosition(board, whitePieces, PieceType.BISHOP);
                Position blackPos = findPiecePosition(board, blackPieces, PieceType.BISHOP);

                if (whitePos != null && blackPos != null) {
                    // Check if bishops are on same color squares
                    boolean whiteBishopOnLight = (whitePos.getRank() + whitePos.getFile()) % 2 == 0;
                    boolean blackBishopOnLight = (blackPos.getRank() + blackPos.getFile()) % 2 == 0;
                    if (whiteBishopOnLight == blackBishopOnLight) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private Piece findNonKingPiece(Board board, List<Position> positions) {
        for (Position pos : positions) {
            Piece piece = board.getPiece(pos);
            if (piece != null && piece.getType() != PieceType.KING) {
                return piece;
            }
        }
        return null;
    }

    private Position findPiecePosition(Board board, List<Position> positions, PieceType type) {
        for (Position pos : positions) {
            Piece piece = board.getPiece(pos);
            if (piece != null && piece.getType() == type) {
                return pos;
            }
        }
        return null;
    }

    public GameStatus determineGameStatus(Board board) {
        Color currentPlayer = board.getCurrentTurn();

        // Check for checkmate
        if (isCheckmate(board, currentPlayer)) {
            return GameStatus.CHECKMATE;
        }

        // Check for stalemate
        if (isStalemate(board, currentPlayer)) {
            return GameStatus.STALEMATE;
        }

        // Check for draws
        if (isDrawByFiftyMoveRule(board)) {
            return GameStatus.DRAW_FIFTY_MOVE;
        }

        if (isDrawByThreefoldRepetition(board)) {
            return GameStatus.DRAW_REPETITION;
        }

        if (isDrawByInsufficientMaterial(board)) {
            return GameStatus.DRAW_INSUFFICIENT_MATERIAL;
        }

        return GameStatus.IN_PROGRESS;
    }

    public Map<String, Object> getGameState(Board board) {
        Color currentPlayer = board.getCurrentTurn();
        GameStatus status = determineGameStatus(board);
        boolean isCheck = moveValidator.isKingInCheck(board, currentPlayer);
        List<Move> legalMoves = moveValidator.generateLegalMoves(board, currentPlayer);

        return Map.of(
            "fen", board.toFEN(),
            "currentTurn", currentPlayer.toString(),
            "status", status.toString(),
            "isCheck", isCheck,
            "legalMovesCount", legalMoves.size(),
            "halfMoveClock", board.getHalfMoveClock(),
            "fullMoveNumber", board.getFullMoveNumber()
        );
    }
}
