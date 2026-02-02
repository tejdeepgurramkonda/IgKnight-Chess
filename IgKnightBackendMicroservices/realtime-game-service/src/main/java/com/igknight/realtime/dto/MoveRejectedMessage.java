package com.igknight.realtime.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for MOVE_REJECTED message when move validation fails
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveRejectedMessage {
    private String reason;
}
