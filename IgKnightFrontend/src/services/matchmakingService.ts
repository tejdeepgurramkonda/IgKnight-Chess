/**
 * Matchmaking Service
 * Handles matchmaking queue operations
 * 
 * CRITICAL: All requests go through API Gateway at /matchmaking/*
 */

import { httpClient } from './httpClient';
import type {
  JoinMatchmakingRequest,
  JoinMatchmakingResponse,
} from '@/types/game';

export const matchmakingService = {
  /**
   * Join the matchmaking queue
   * Backend will match players with same time control and compatible rating
   */
  async joinQueue(
    request: JoinMatchmakingRequest
  ): Promise<JoinMatchmakingResponse> {
    // All requests go through API Gateway
    // Gateway will forward to matchmaking service and inject X-User-Id, X-Username headers
    return httpClient.post<JoinMatchmakingResponse>(
      '/matchmaking/join',
      request
    );
  },

  /**
   * Leave the matchmaking queue
   */
  async leaveQueue(): Promise<JoinMatchmakingResponse> {
    return httpClient.post<JoinMatchmakingResponse>(
      '/matchmaking/leave',
      {}
    );
  },

  /**
   * Check matchmaking status - used for polling while in queue
   * Backend will return MATCHED if a match was found for the waiting player
   */
  async checkStatus(): Promise<JoinMatchmakingResponse> {
    return httpClient.get<JoinMatchmakingResponse>('/matchmaking/status');
  },
};
