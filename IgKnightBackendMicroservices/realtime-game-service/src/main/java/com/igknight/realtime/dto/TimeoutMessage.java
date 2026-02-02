package com.igknight.realtime.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for TIMEOUT message when a player times out
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimeoutMessage {
    private String timedOutPlayer; // WHITE or BLACK
    private String winner; // WHITE or BLACK
    private String reason;
}
