package com.igknight.game.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class LegalMovesResponse {
    private String square;
    private List<String> legalMoves;
}
