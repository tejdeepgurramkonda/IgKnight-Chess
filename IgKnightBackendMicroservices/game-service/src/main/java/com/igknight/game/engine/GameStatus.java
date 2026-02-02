package com.igknight.game.engine;

public enum GameStatus {
    WAITING,        // Waiting for players
    IN_PROGRESS,    // Game is ongoing
    CHECKMATE,      // Game ended by checkmate
    STALEMATE,      // Game ended by stalemate
    DRAW_AGREEMENT, // Players agreed to draw
    DRAW_REPETITION,// Draw by threefold repetition
    DRAW_FIFTY_MOVE,// Draw by fifty-move rule
    DRAW_INSUFFICIENT_MATERIAL, // Draw by insufficient material
    RESIGNATION,    // One player resigned
    TIMEOUT,        // One player ran out of time
    ABANDONED       // Game was abandoned
}
