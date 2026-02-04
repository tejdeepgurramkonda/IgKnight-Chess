/**
 * Environment Configuration
 * All API requests go through API Gateway
 * WebSocket URLs automatically adapt to HTTP/HTTPS and WS/WSS
 */

/**
 * Builds WebSocket base URL with automatic protocol detection
 * - Uses VITE_WS_BASE_URL if provided (for custom deployments)
 * - Otherwise derives from window.location:
 *   - https:// → wss://
 *   - http:// → ws://
 * 
 * @param envVar - Environment variable value (e.g., VITE_WS_BASE_URL)
 * @param defaultHost - Default host and port (e.g., 'localhost:8087')
 * @returns Complete WebSocket URL with correct protocol
 */
function getWebSocketBaseUrl(envVar: string | undefined, defaultHost: string): string {
  // If environment variable is provided, use it as-is
  // This allows full control in production (e.g., wss://api.yourdomain.com)
  if (envVar) {
    return envVar;
  }

  // Otherwise, derive protocol from current page and use default host
  // This enables automatic ws:// for http:// and wss:// for https://
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${defaultHost}`;
}

/**
 * Builds HTTP base URL with automatic protocol detection
 * - Uses environment variable if provided
 * - Otherwise derives from window.location protocol
 */
function getHttpBaseUrl(envVar: string | undefined, defaultHost: string): string {
  if (envVar) {
    return envVar;
  }

  const protocol = window.location.protocol; // http: or https:
  return `${protocol}//${defaultHost}`;
}

export const ENV = {
  // All HTTP requests go through API Gateway
  // Automatically adapts to http:// or https:// based on current page
  API_BASE_URL: getHttpBaseUrl(
    import.meta.env.VITE_API_BASE_URL,
    'localhost:8083'
  ),
  
  // WebSocket connection (direct to realtime service for game moves)
  // Automatically adapts to ws:// or wss:// based on current page protocol
  WS_BASE_URL: getWebSocketBaseUrl(
    import.meta.env.VITE_WS_BASE_URL,
    'localhost:8087'
  ),

  // STOMP WebSocket connection (game-service for chat via API Gateway)
  // Automatically adapts to http:// or https:// for SockJS fallback
  STOMP_WS_URL: getHttpBaseUrl(
    import.meta.env.VITE_STOMP_WS_URL,
    'localhost:8082'
  ),

  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
