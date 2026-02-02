package com.igknight.matchmaking.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Represents a player's entry in the matchmaking queue
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QueueEntry {
    private String userId;
    private String username;
    private Integer rating;
    private String timeControl;
    private LocalDateTime joinedAt;
}
