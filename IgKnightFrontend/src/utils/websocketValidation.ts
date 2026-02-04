/**
 * Runtime Type Guards for WebSocket Messages
 * Validates message structure before accessing properties to prevent crashes
 */

import type { WebSocketMessage } from '@/types/websocket';
import type { GameResponse } from '@/types/game';

/**
 * Type guard for GAME_START message
 */
export function isGameStartMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: GameResponse;
} {
  if (message.type !== 'GAME_START') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return (
    typeof data.id === 'number' &&
    typeof data.status === 'string' &&
    typeof data.whitePlayerId === 'number' &&
    typeof data.blackPlayerId === 'number' &&
    Array.isArray(data.moves)
  );
}

/**
 * Type guard for GAME_UPDATE message
 */
export function isGameUpdateMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: GameResponse;
} {
  if (message.type !== 'GAME_UPDATE') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return (
    typeof data.id === 'number' &&
    typeof data.status === 'string' &&
    typeof data.currentTurn === 'string'
  );
}

/**
 * Type guard for GAME_STATE message (sent on resume/reconnect)
 */
export function isGameStateMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: GameResponse;
} {
  if (message.type !== 'GAME_STATE') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return (
    typeof data.id === 'number' &&
    typeof data.fenPosition === 'string' &&
    typeof data.status === 'string'
  );
}

/**
 * Type guard for PLAYER_MOVE or MOVE_RESULT message
 * Backend sends MOVE_RESULT after processing a move
 */
export function isPlayerMoveMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: {
    from: string;
    to: string;
    promotion?: string;
    piece?: string;
    captured?: string;
    san: string;
    fen?: string;
    nextTurn?: string;
    isCheck?: boolean;
    isCheckmate?: boolean;
    isCapture?: boolean;
  };
} {
  // Accept both PLAYER_MOVE and MOVE_RESULT
  if (message.type !== 'PLAYER_MOVE' && message.type !== 'MOVE_RESULT') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return (
    typeof data.from === 'string' &&
    typeof data.to === 'string' &&
    typeof data.san === 'string'
  );
}

/**
 * Type guard for GAME_END message
 */
export function isGameEndMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: {
    winner?: 'WHITE' | 'BLACK';
    reason: string;
    status: string;
  };
} {
  if (message.type !== 'GAME_END') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return (
    typeof data.reason === 'string' &&
    typeof data.status === 'string'
  );
}

/**
 * Type guard for ERROR message
 */
export function isErrorMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: {
    message: string;
    code?: string;
  };
} {
  if (message.type !== 'ERROR') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return typeof data.message === 'string';
}

/**
 * Type guard for CLOCK_UPDATE message
 * Backend sends whiteTimeMs and blackTimeMs in milliseconds
 */
export function isClockUpdateMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: {
    whiteTimeMs: number;
    blackTimeMs: number;
    activeColor: 'WHITE' | 'BLACK';
  };
} {
  if (message.type !== 'CLOCK_UPDATE') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return (
    typeof data.whiteTimeMs === 'number' &&
    typeof data.blackTimeMs === 'number' &&
    (data.activeColor === 'WHITE' || data.activeColor === 'BLACK')
  );
}

/**
 * Type guard for TIMEOUT message
 */
export function isTimeoutMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: {
    timedOutPlayer: 'WHITE' | 'BLACK';
    winner: 'WHITE' | 'BLACK';
    reason: string;
  };
} {
  if (message.type !== 'TIMEOUT') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return (
    (data.timedOutPlayer === 'WHITE' || data.timedOutPlayer === 'BLACK') &&
    (data.winner === 'WHITE' || data.winner === 'BLACK') &&
    typeof data.reason === 'string'
  );
}

/**
 * Type guard for MOVE_REJECTED message
 */
export function isMoveRejectedMessage(message: WebSocketMessage): message is WebSocketMessage & {
  data: {
    reason: string;
    move?: { from: string; to: string };
  };
} {
  if (message.type !== 'MOVE_REJECTED') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  const data = message.data as any;
  return typeof data.reason === 'string';
}

/**
 * Generic validation - checks if message has expected type
 */
export function validateMessageType(
  message: WebSocketMessage,
  expectedType: string
): boolean {
  return message.type === expectedType && message.data !== undefined;
}

/**
 * Safe message data extraction with fallback
 */
export function safeExtractData<T>(
  message: WebSocketMessage,
  validator: (msg: WebSocketMessage) => boolean,
  defaultValue: T
): T {
  try {
    if (validator(message)) {
      return message.data as T;
    }
  } catch (error) {
    console.error('Message validation failed:', error);
  }
  return defaultValue;
}
