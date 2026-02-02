package com.igknight.matchmaking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for joining matchmaking queue
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JoinMatchmakingRequest {
    @NotBlank(message = "Username is required")
    private String username;

    @NotNull(message = "Rating is required")
    private Integer rating;

    @NotBlank(message = "Time control is required")
    private String timeControl;
}
