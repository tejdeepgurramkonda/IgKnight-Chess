/**
 * Game Types - Matching Backend DTOs
 */

export interface PlayerInfo {
  id: number;
  username: string;
}

/**
 * MoveInfo - matches backend GameMove entity
 */
export interface MoveInfo {
  moveNumber: number;
  from: string;              // Backend uses 'from' not 'fromSquare'
  to: string;                // Backend uses 'to' not 'toSquare'
  piece: string;             // Backend uses 'piece' not 'pieceType'
  san: string;               // SAN notation (e.g., 'e4', 'Nf3', 'O-O')
  resultingFen: string;      // FEN position after move
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
}

/**
 * GameStatus - EXACT backend enum values
 */
export type GameStatus =
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'CHECKMATE'
  | 'STALEMATE'
  | 'DRAW_AGREEMENT'
  | 'DRAW_REPETITION'
  | 'DRAW_FIFTY_MOVE'
  | 'DRAW_INSUFFICIENT_MATERIAL'
  | 'RESIGNATION'
  | 'TIMEOUT'
  | 'ABANDONED';

/**
 * GameResponse - EXACT backend DTO structure
 */
export interface GameResponse {
  id: number;
  whitePlayerId: number | null;
  whitePlayerUsername: string | null;
  blackPlayerId: number | null;
  blackPlayerUsername: string | null;
  fenPosition: string;
  pgnMoves: string | null;
  currentTurn: 'WHITE' | 'BLACK';
  status: GameStatus;
  winnerId: number | null;
  whiteTimeRemaining: number | null;  // seconds
  blackTimeRemaining: number | null;  // seconds
  timeControl: number | null;         // seconds
  timeIncrement: number | null;       // seconds
  isRated: boolean;
  lastMoveAt: string | null;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
  moves: MoveInfo[];  // Backend uses 'moves' NOT 'moveHistory'
}

export interface CreateGameRequest {
  timeControl?: number | null;      // SECONDS (not minutes!) - null = unlimited
  timeIncrement?: number | null;    // SECONDS - null or 0 = no increment
  isRated?: boolean;
}

export interface MakeMoveRequest {
  from: string;
  to: string;
  promotion?: string;
}

export interface LegalMovesResponse {
  square: string;
  legalMoves: string[];
}

export interface JoinMatchmakingRequest {
  username: string;
  rating: number;
  timeControl: string;
}

export interface MatchFound {
  gameId: number;
  opponentUsername: string;
  opponentRating: number;
  playerColor: string;
  timeControl: string;
}

export interface JoinMatchmakingResponse {
  status: 'QUEUED' | 'MATCHED' | 'LEFT' | 'ERROR';
  message: string;
  match?: MatchFound;
}

export interface ChatMessageDTO {
  id?: number;
  gameId: number;
  userId: number;
  username: string;
  message: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  gameId: number;
  messages: ChatMessageDTO[];
  totalMessages: number;
}
