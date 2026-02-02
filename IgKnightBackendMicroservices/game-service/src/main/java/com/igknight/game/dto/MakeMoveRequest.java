package com.igknight.game.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MakeMoveRequest {
    @NotBlank(message = "From square is required")
    private String from;

    @NotBlank(message = "To square is required")
    private String to;

    private String promotion;
}
