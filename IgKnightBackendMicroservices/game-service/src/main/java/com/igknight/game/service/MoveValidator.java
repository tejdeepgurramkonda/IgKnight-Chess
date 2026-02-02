package com.igknight.game.service;

import com.igknight.game.engine.*;
import com.igknight.game.engine.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MoveValidator {

    private final MoveGenerator moveGenerator;

    public MoveValidator(MoveGenerator moveGenerator) {
        this.moveGenerator = moveGenerator;
    }

    public List<Move> generateLegalMoves(Board board, Color color) {
        List<Move> pseudoLegalMoves = moveGenerator.generatePseudoLegalMoves(board, color);
        return pseudoLegalMoves.stream()
                .filter(move -> isMoveLegal(board, move, color))
                .collect(Collectors.toList());
    }

    public List<Move> generateLegalMovesForPiece(Board board, Position from) {
        Piece piece = board.getPiece(from);
        if (piece == null) {
            return List.of();
        }

        List<Move> pseudoLegalMoves = moveGenerator.generatePseudoLegalMovesForPiece(board, from, piece);
        return pseudoLegalMoves.stream()
                .filter(move -> isMoveLegal(board, move, piece.getColor()))
                .collect(Collectors.toList());
    }

    public boolean isMoveLegal(Board board, Move move, Color color) {
        // Make the move on a copy of the board
        Board testBoard = board.copy();
        executeMove(testBoard, move);

        // Check if the king is in check after the move
        Position kingPos = testBoard.findKing(color);
        if (kingPos == null) {
            return false;
        }

        return !moveGenerator.isSquareAttacked(testBoard, kingPos, color.opposite());
    }

    public boolean validateMove(Board board, Move move) {
        Piece piece = board.getPiece(move.getFrom());
        if (piece == null) {
            return false;
        }

        // Check if it's the correct player's turn
        if (piece.getColor() != board.getCurrentTurn()) {
            return false;
        }

        // Generate legal moves and check if the move is in the list
        List<Move> legalMoves = generateLegalMovesForPiece(board, move.getFrom());
        return legalMoves.stream().anyMatch(legalMove -> 
            legalMove.getFrom().equals(move.getFrom()) &&
            legalMove.getTo().equals(move.getTo()) &&
            (legalMove.getPromotionPiece() == move.getPromotionPiece() ||
             (legalMove.getPromotionPiece() == null && move.getPromotionPiece() == null))
        );
    }

    public void executeMove(Board board, Move move) {
        Piece piece = board.getPiece(move.getFrom());
        if (piece == null) {
            return;
        }

        // Reset en passant target
        Position previousEnPassant = board.getEnPassantTarget();
        board.setEnPassantTarget(null);

        // Handle castling
        if (move.isCastling()) {
            executeCastling(board, move, piece.getColor());
            piece.setMoved(true);
            board.incrementHalfMoveClock();
        }
        // Handle en passant capture
        else if (move.isEnPassant()) {
            board.removePiece(move.getFrom());
            board.setPiece(move.getTo(), piece);
            // Remove the captured pawn
            int capturedPawnRank = piece.getColor() == Color.WHITE ? move.getTo().getRank() - 1 : move.getTo().getRank() + 1;
            board.removePiece(new Position(capturedPawnRank, move.getTo().getFile()));
            piece.setMoved(true);
            board.resetHalfMoveClock();
        }
        // Handle pawn promotion
        else if (move.isPromotion()) {
            board.removePiece(move.getFrom());
            Piece promotedPiece = new Piece(move.getPromotionPiece(), piece.getColor(), true);
            board.setPiece(move.getTo(), promotedPiece);
            board.resetHalfMoveClock();
        }
        // Regular move
        else {
            boolean isCapture = board.getPiece(move.getTo()) != null;
            boolean isPawnMove = piece.getType() == PieceType.PAWN;

            board.removePiece(move.getFrom());
            board.setPiece(move.getTo(), piece);
            piece.setMoved(true);

            // Set en passant target for double pawn move
            if (isPawnMove && Math.abs(move.getTo().getRank() - move.getFrom().getRank()) == 2) {
                int enPassantRank = (move.getFrom().getRank() + move.getTo().getRank()) / 2;
                board.setEnPassantTarget(new Position(enPassantRank, move.getFrom().getFile()));
            }

            // Update halfmove clock
            if (isCapture || isPawnMove) {
                board.resetHalfMoveClock();
            } else {
                board.incrementHalfMoveClock();
            }
        }

        // Update castling rights
        updateCastlingRights(board, move, piece);

        // Switch turn
        board.setCurrentTurn(board.getCurrentTurn().opposite());
        if (board.getCurrentTurn() == Color.WHITE) {
            board.incrementFullMoveNumber();
        }

        // Add position to history for threefold repetition detection
        board.addToPositionHistory(board.toFEN().split(" ")[0]);
    }

    private void executeCastling(Board board, Move move, Color color) {
        int rank = color.getStartRank();
        Position kingFrom = move.getFrom();
        Position kingTo = move.getTo();

        // Move king
        Piece king = board.getPiece(kingFrom);
        board.removePiece(kingFrom);
        board.setPiece(kingTo, king);

        // Move rook
        if (kingTo.getFile() == 7) { // Kingside
            Position rookFrom = new Position(rank, 8);
            Position rookTo = new Position(rank, 6);
            Piece rook = board.getPiece(rookFrom);
            board.removePiece(rookFrom);
            board.setPiece(rookTo, rook);
            if (rook != null) {
                rook.setMoved(true);
            }
        } else if (kingTo.getFile() == 3) { // Queenside
            Position rookFrom = new Position(rank, 1);
            Position rookTo = new Position(rank, 4);
            Piece rook = board.getPiece(rookFrom);
            board.removePiece(rookFrom);
            board.setPiece(rookTo, rook);
            if (rook != null) {
                rook.setMoved(true);
            }
        }
    }

    private void updateCastlingRights(Board board, Move move, Piece piece) {
        Color color = piece.getColor();

        // If king moves, lose all castling rights for that color
        if (piece.getType() == PieceType.KING) {
            board.setCastlingRights(color, false, false);
        }

        // If rook moves from starting position, lose castling right on that side
        if (piece.getType() == PieceType.ROOK) {
            int startRank = color.getStartRank();
            if (move.getFrom().equals(new Position(startRank, 1))) {
                board.setCastlingRights(color, board.canCastleKingside(color), false);
            } else if (move.getFrom().equals(new Position(startRank, 8))) {
                board.setCastlingRights(color, false, board.canCastleQueenside(color));
            }
        }

        // If rook is captured, opponent loses castling right on that side
        Color opponentColor = color.opposite();
        int opponentStartRank = opponentColor.getStartRank();
        if (move.getTo().equals(new Position(opponentStartRank, 1))) {
            board.setCastlingRights(opponentColor, board.canCastleKingside(opponentColor), false);
        } else if (move.getTo().equals(new Position(opponentStartRank, 8))) {
            board.setCastlingRights(opponentColor, false, board.canCastleQueenside(opponentColor));
        }
    }

    public boolean isKingInCheck(Board board, Color color) {
        Position kingPos = board.findKing(color);
        if (kingPos == null) {
            return false;
        }
        return moveGenerator.isSquareAttacked(board, kingPos, color.opposite());
    }

    public boolean canCastleThrough(Board board, Color color, boolean kingside) {
        int rank = color.getStartRank();
        Position kingPos = board.findKing(color);
        
        if (kingPos == null || isKingInCheck(board, color)) {
            return false;
        }

        // Check if squares the king moves through are not under attack
        if (kingside) {
            for (int file = 6; file <= 7; file++) {
                Position square = new Position(rank, file);
                if (moveGenerator.isSquareAttacked(board, square, color.opposite())) {
                    return false;
                }
            }
        } else {
            for (int file = 3; file <= 4; file++) {
                Position square = new Position(rank, file);
                if (moveGenerator.isSquareAttacked(board, square, color.opposite())) {
                    return false;
                }
            }
        }

        return true;
    }
}
