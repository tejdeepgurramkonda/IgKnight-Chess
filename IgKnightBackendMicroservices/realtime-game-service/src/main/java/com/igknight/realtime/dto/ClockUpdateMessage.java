package com.igknight.realtime.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for CLOCK_UPDATE message broadcast to all players
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClockUpdateMessage {
    private Long whiteTimeMs;
    private Long blackTimeMs;
    private String activeColor;
}
