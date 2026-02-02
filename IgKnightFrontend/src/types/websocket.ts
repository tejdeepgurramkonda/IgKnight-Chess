/**
 * WebSocket Message Types
 */

export type WebSocketMessageType =
  | 'CONNECTED'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'JOIN'
  | 'MOVE'
  | 'PLAYER_MOVE'       // Backend sends this for opponent moves
  | 'MOVE_RESULT'
  | 'MOVE_REJECTED'
  | 'GAME_START'        // Backend sends when game starts
  | 'GAME_UPDATE'       // Backend sends on game state changes
  | 'GAME_END'          // Backend sends when game ends
  | 'GAME_STATE'
  | 'CLOCK_UPDATE'
  | 'CHAT_MESSAGE'      // Chat messages
  | 'RESIGN'
  | 'DRAW_OFFER'
  | 'TIMEOUT'
  | 'MESSAGE'
  | 'PING'
  | 'PONG'
  | 'ERROR';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: any;  // Backend uses 'data' not 'payload'
  gameId?: string;
  userId?: string;
  message?: string;
}

export interface MoveMessage extends WebSocketMessage {
  type: 'MOVE';
  data: {
    from: string;
    to: string;
    promotion?: string;
  };
}

export interface MoveResultMessage extends WebSocketMessage {
  type: 'MOVE_RESULT';
  data: {
    from: string;
    to: string;
    piece: string;
    san: string;
    fen: string;
    nextTurn: string;
    isCapture?: boolean;
    isCheck?: boolean;
    isCheckmate?: boolean;
  };
}

export interface GameStateMessage extends WebSocketMessage {
  type: 'GAME_STATE';
  data: {
    fen: string;
    currentTurn: string;
    status: string;
    whitePlayer?: { id: number; username: string } | null;
    blackPlayer?: { id: number; username: string } | null;
    lastMove?: {
      from: string;
      to: string;
      piece: string;
      san: string;
      isCapture?: boolean;
      isCheck?: boolean;
      isCheckmate?: boolean;
    };
  };
}

export interface ClockUpdateMessage extends WebSocketMessage {
  type: 'CLOCK_UPDATE';
  data: {
    whiteTimeMs: number;
    blackTimeMs: number;
    activeColor: string;
  };
}

export interface MoveRejectedMessage extends WebSocketMessage {
  type: 'MOVE_REJECTED';
  data: {
    reason: string;
  };
}

export interface ChatMessageData extends WebSocketMessage {
  type: 'CHAT_MESSAGE';
  data: {
    id?: number;
    userId: number;
    username: string;
    message: string;
    timestamp: string;
  };
}
