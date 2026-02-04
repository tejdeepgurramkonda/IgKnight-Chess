package com.igknight.game.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Request for making a move - includes idempotency key for duplicate prevention
 */
@Data
public class MakeMoveRequest {
    
    @NotBlank(message = "From square is required")
    @Pattern(regexp = "[a-h][1-8]", message = "From square must be valid chess notation (e.g., 'e2')")
    private String from;

    @NotBlank(message = "To square is required")
    @Pattern(regexp = "[a-h][1-8]", message = "To square must be valid chess notation (e.g., 'e4')")
    private String to;

    @Pattern(regexp = "[QRBN]?", message = "Promotion must be Q, R, B, or N")
    private String promotion;
    
    /**
     * Idempotency key - prevents duplicate move submissions
     * Format: {gameId}-{moveNumber}-{timestamp}
     */
    private String idempotencyKey;
    
    /**
     * Client timestamp (for clock validation - NOT trusted, only for drift detection)
     */
    private Long clientTimestamp;
}
