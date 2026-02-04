/**
 * Chess type definitions - NO CHESS LOGIC
 * These types are ONLY for rendering and display.
 * All chess rules, validation, and state management happen on the backend.
 */

export type Square = string; // e.g., 'e4', 'a1'
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

/**
 * Board representation parsed from FEN string.
 * This is DISPLAY ONLY - no logic, no validation.
 */
export interface BoardPosition {
  [square: string]: Piece | null;
}

/**
 * Parse FEN string to get board position ONLY.
 * Does NOT validate, does NOT enforce rules.
 * Only extracts piece placement for rendering.
 */
export function parseFenForDisplay(fen: string): BoardPosition {
  const position: BoardPosition = {};
  const [boardPart] = fen.split(' ');
  const ranks = boardPart.split('/');
  
  ranks.forEach((rank, rankIndex) => {
    let fileIndex = 0;
    for (const char of rank) {
      if (/\d/.test(char)) {
        // Empty squares
        fileIndex += parseInt(char);
      } else {
        // Piece
        const file = String.fromCharCode(97 + fileIndex) as File;
        const rankNum = (8 - rankIndex) as Rank;
        const square = `${file}${rankNum}`;
        
        const color: PieceColor = char === char.toUpperCase() ? 'w' : 'b';
        const type = char.toLowerCase() as PieceType;
        
        position[square] = { type, color };
        fileIndex++;
      }
    }
  });
  
  return position;
}

/**
 * Get current turn from FEN string.
 * Does NOT determine turn - just parses what backend sent.
 */
export function parseTurnFromFen(fen: string): 'w' | 'b' {
  const parts = fen.split(' ');
  return parts[1] === 'w' ? 'w' : 'b';
}
