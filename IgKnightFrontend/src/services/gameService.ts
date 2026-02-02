/**
 * Game Service
 * Handles all chess game operations
 */

import { httpClient } from './httpClient';
import type {
  GameResponse,
  CreateGameRequest,
  MakeMoveRequest,
  LegalMovesResponse,
  ChatHistoryResponse,
} from '@/types/game';

export const gameService = {
  /**
   * Create a new game
   */
  async createGame(request: CreateGameRequest = {}): Promise<GameResponse> {
    return httpClient.post<GameResponse>('/api/chess/games/create', request);
  },

  /**
   * Join an existing game
   */
  async joinGame(gameId: number): Promise<GameResponse> {
    return httpClient.post<GameResponse>(`/api/chess/games/${gameId}/join`);
  },

  /**
   * Get game details
   */
  async getGame(gameId: number): Promise<GameResponse> {
    return httpClient.get<GameResponse>(`/api/chess/games/${gameId}`);
  },

  /**
   * Get all games for current user
   */
  async getUserGames(): Promise<GameResponse[]> {
    return httpClient.get<GameResponse[]>('/api/chess/games');
  },

  /**
   * Get active games for current user
   */
  async getActiveGames(): Promise<GameResponse[]> {
    return httpClient.get<GameResponse[]>('/api/chess/games/active');
  },

  /**
   * Make a move in a game
   */
  async makeMove(
    gameId: number,
    move: MakeMoveRequest
  ): Promise<GameResponse> {
    return httpClient.post<GameResponse>(
      `/api/chess/games/${gameId}/moves`,
      move
    );
  },

  /**
   * Get legal moves for a square
   */
  async getLegalMoves(
    gameId: number,
    square: string
  ): Promise<LegalMovesResponse> {
    return httpClient.get<LegalMovesResponse>(
      `/api/chess/games/${gameId}/legal-moves/${square}`
    );
  },

  /**
   * Resign from a game
   */
  async resignGame(gameId: number): Promise<GameResponse> {
    return httpClient.post<GameResponse>(`/api/chess/games/${gameId}/resign`);
  },

  /**
   * Get chat history for a game
   */
  async getChatHistory(gameId: number): Promise<ChatHistoryResponse> {
    return httpClient.get<ChatHistoryResponse>(`/api/chess/games/${gameId}/chat`);
  },
};
