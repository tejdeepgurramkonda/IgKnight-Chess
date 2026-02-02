package com.igknight.matchmaking.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for matchmaking operations
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class JoinMatchmakingResponse {
    private String status;
    private String message;
    private MatchFound match;

    public JoinMatchmakingResponse(String status) {
        this.status = status;
    }

    public JoinMatchmakingResponse(String status, String message) {
        this.status = status;
        this.message = message;
    }
}
