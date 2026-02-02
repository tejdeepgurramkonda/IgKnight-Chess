package com.igknight.realtime.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for MOVE message from WebSocket client
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveMessage {
    private String from;
    private String to;
    private String promotion;
}
