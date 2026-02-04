package com.igknight.game.exception;

/**
 * Exception thrown when a user attempts to access a game they are not authorized for.
 * Results in HTTP 403 Forbidden response.
 */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
