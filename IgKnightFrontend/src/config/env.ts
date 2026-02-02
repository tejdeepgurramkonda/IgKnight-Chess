/**
 * Environment Configuration
 * All API requests go through API Gateway
 */

export const ENV = {
  // All HTTP requests go through API Gateway
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083',
  
  // WebSocket connection (direct to realtime service for game moves)
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8087',

  // STOMP WebSocket connection (game-service for chat)
  STOMP_WS_URL: import.meta.env.VITE_STOMP_WS_URL || 'http://localhost:8082',

  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
