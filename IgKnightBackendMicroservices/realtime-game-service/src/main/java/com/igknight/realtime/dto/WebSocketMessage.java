package com.igknight.realtime.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Base WebSocket message structure
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {
    private String type;
    private Object data;
}
