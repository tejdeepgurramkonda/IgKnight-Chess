package com.igknight.game.service;

import com.igknight.game.engine.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MoveGenerator {

    public List<Move> generatePseudoLegalMoves(Board board, Color color) {
        List<Move> moves = new ArrayList<>();
        List<Position> pieces = board.getAllPiecesPositions(color);
        
        for (Position from : pieces) {
            Piece piece = board.getPiece(from);
            if (piece != null && piece.getColor() == color) {
                moves.addAll(generatePseudoLegalMovesForPiece(board, from, piece));
            }
        }
        
        return moves;
    }

    public List<Move> generatePseudoLegalMovesForPiece(Board board, Position from, Piece piece) {
        return switch (piece.getType()) {
            case PAWN -> generatePawnMoves(board, from, piece.getColor());
            case KNIGHT -> generateKnightMoves(board, from, piece.getColor());
            case BISHOP -> generateBishopMoves(board, from, piece.getColor());
            case ROOK -> generateRookMoves(board, from, piece.getColor());
            case QUEEN -> generateQueenMoves(board, from, piece.getColor());
            case KING -> generateKingMoves(board, from, piece.getColor());
        };
    }

    private List<Move> generatePawnMoves(Board board, Position from, Color color) {
        List<Move> moves = new ArrayList<>();
        int direction = color.getDirection();
        int startRank = color.getPawnStartRank();
        int promotionRank = color.getPromotionRank();

        // Forward move
        Position oneForward = from.move(direction, 0);
        if (oneForward != null && board.getPiece(oneForward) == null) {
            if (oneForward.getRank() == promotionRank) {
                // Promotion
                moves.add(new Move(from, oneForward, PieceType.QUEEN, false, false, false));
                moves.add(new Move(from, oneForward, PieceType.ROOK, false, false, false));
                moves.add(new Move(from, oneForward, PieceType.BISHOP, false, false, false));
                moves.add(new Move(from, oneForward, PieceType.KNIGHT, false, false, false));
            } else {
                moves.add(new Move(from, oneForward, null, false, false, false));
            }

            // Double forward move from starting position
            if (from.getRank() == startRank) {
                Position twoForward = from.move(direction * 2, 0);
                if (twoForward != null && board.getPiece(twoForward) == null) {
                    moves.add(new Move(from, twoForward, null, false, false, false));
                }
            }
        }

        // Captures
        for (int fileDelta : new int[]{-1, 1}) {
            Position capturePos = from.move(direction, fileDelta);
            if (capturePos != null) {
                Piece targetPiece = board.getPiece(capturePos);
                if (targetPiece != null && targetPiece.getColor() != color) {
                    if (capturePos.getRank() == promotionRank) {
                        // Capture with promotion
                        moves.add(new Move(from, capturePos, PieceType.QUEEN, true, false, false));
                        moves.add(new Move(from, capturePos, PieceType.ROOK, true, false, false));
                        moves.add(new Move(from, capturePos, PieceType.BISHOP, true, false, false));
                        moves.add(new Move(from, capturePos, PieceType.KNIGHT, true, false, false));
                    } else {
                        moves.add(new Move(from, capturePos, null, true, false, false));
                    }
                }
                // En passant
                else if (capturePos.equals(board.getEnPassantTarget())) {
                    moves.add(new Move(from, capturePos, null, true, false, true));
                }
            }
        }

        return moves;
    }

    private List<Move> generateKnightMoves(Board board, Position from, Color color) {
        List<Move> moves = new ArrayList<>();
        int[][] knightOffsets = {
            {2, 1}, {2, -1}, {-2, 1}, {-2, -1},
            {1, 2}, {1, -2}, {-1, 2}, {-1, -2}
        };

        for (int[] offset : knightOffsets) {
            Position to = from.move(offset[0], offset[1]);
            if (to != null) {
                Piece targetPiece = board.getPiece(to);
                if (targetPiece == null) {
                    moves.add(new Move(from, to));
                } else if (targetPiece.getColor() != color) {
                    moves.add(new Move(from, to, null, true, false, false));
                }
            }
        }

        return moves;
    }

    private List<Move> generateBishopMoves(Board board, Position from, Color color) {
        return generateSlidingMoves(board, from, color, new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}});
    }

    private List<Move> generateRookMoves(Board board, Position from, Color color) {
        return generateSlidingMoves(board, from, color, new int[][]{{1, 0}, {-1, 0}, {0, 1}, {0, -1}});
    }

    private List<Move> generateQueenMoves(Board board, Position from, Color color) {
        return generateSlidingMoves(board, from, color, new int[][]{
            {1, 0}, {-1, 0}, {0, 1}, {0, -1},
            {1, 1}, {1, -1}, {-1, 1}, {-1, -1}
        });
    }

    private List<Move> generateSlidingMoves(Board board, Position from, Color color, int[][] directions) {
        List<Move> moves = new ArrayList<>();

        for (int[] direction : directions) {
            int rankDelta = direction[0];
            int fileDelta = direction[1];
            Position current = from;

            while (true) {
                current = current.move(rankDelta, fileDelta);
                if (current == null) break;

                Piece targetPiece = board.getPiece(current);
                if (targetPiece == null) {
                    moves.add(new Move(from, current));
                } else {
                    if (targetPiece.getColor() != color) {
                        moves.add(new Move(from, current, null, true, false, false));
                    }
                    break;
                }
            }
        }

        return moves;
    }

    private List<Move> generateKingMoves(Board board, Position from, Color color) {
        List<Move> moves = new ArrayList<>();
        int[][] kingOffsets = {
            {1, 0}, {-1, 0}, {0, 1}, {0, -1},
            {1, 1}, {1, -1}, {-1, 1}, {-1, -1}
        };

        for (int[] offset : kingOffsets) {
            Position to = from.move(offset[0], offset[1]);
            if (to != null) {
                Piece targetPiece = board.getPiece(to);
                if (targetPiece == null) {
                    moves.add(new Move(from, to));
                } else if (targetPiece.getColor() != color) {
                    moves.add(new Move(from, to, null, true, false, false));
                }
            }
        }

        // Castling
        moves.addAll(generateCastlingMoves(board, from, color));

        return moves;
    }

    private List<Move> generateCastlingMoves(Board board, Position from, Color color) {
        List<Move> moves = new ArrayList<>();
        Piece king = board.getPiece(from);
        
        if (king == null || king.hasMoved()) {
            return moves;
        }

        int rank = color.getStartRank();

        // Kingside castling
        if (board.canCastleKingside(color)) {
            Position rookPos = new Position(rank, 8);
            Piece rook = board.getPiece(rookPos);
            if (rook != null && !rook.hasMoved()) {
                // Check if squares between king and rook are empty
                boolean pathClear = true;
                for (int file = 6; file <= 7; file++) {
                    if (board.getPiece(new Position(rank, file)) != null) {
                        pathClear = false;
                        break;
                    }
                }
                if (pathClear) {
                    Position kingsideCastlePos = new Position(rank, 7);
                    moves.add(new Move(from, kingsideCastlePos, null, false, true, false));
                }
            }
        }

        // Queenside castling
        if (board.canCastleQueenside(color)) {
            Position rookPos = new Position(rank, 1);
            Piece rook = board.getPiece(rookPos);
            if (rook != null && !rook.hasMoved()) {
                // Check if squares between king and rook are empty
                boolean pathClear = true;
                for (int file = 2; file <= 4; file++) {
                    if (board.getPiece(new Position(rank, file)) != null) {
                        pathClear = false;
                        break;
                    }
                }
                if (pathClear) {
                    Position queensideCastlePos = new Position(rank, 3);
                    moves.add(new Move(from, queensideCastlePos, null, false, true, false));
                }
            }
        }

        return moves;
    }

    public boolean isSquareAttacked(Board board, Position square, Color byColor) {
        // Check if the square is attacked by any piece of the given color
        List<Position> attackerPositions = board.getAllPiecesPositions(byColor);
        
        for (Position attackerPos : attackerPositions) {
            Piece attacker = board.getPiece(attackerPos);
            if (attacker == null) continue;

            List<Move> attackerMoves = generatePseudoLegalMovesForPiece(board, attackerPos, attacker);
            for (Move move : attackerMoves) {
                if (move.getTo().equals(square)) {
                    // For pawns, only captures can attack a square
                    if (attacker.getType() == PieceType.PAWN) {
                        if (move.isCapture() || move.isEnPassant()) {
                            return true;
                        }
                    } else {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
}
