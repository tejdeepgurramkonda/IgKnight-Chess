/**
 * WebSocket Service
 * Real-time game updates via WebSocket
 * 
 * CRITICAL CONTRACT REQUIREMENTS:
 * - NEVER assume message.data exists - always check first
 * - Route ALL backend message types (GAME_START, GAME_UPDATE, GAME_END, PLAYER_MOVE, etc.)
 * - Prevent duplicate connections
 * - Handle reconnects gracefully
 * - Backend is authoritative - frontend must adapt
 */

import { ENV } from '@/config/env';
import { tokenStorage } from './tokenStorage';
import type { WebSocketMessage } from '@/types/websocket';

type MessageHandler = (message: WebSocketMessage) => void;

export class GameWebSocketService {
  private ws: WebSocket | null = null;
  private gameId: string | null = null;
  private userId: string | null = null;
  private messageHandlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isIntentionalDisconnect = false;
  
  // Heartbeat mechanism
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30s
  private readonly HEARTBEAT_TIMEOUT = 10000; // 10s
  private lastPongReceived: number = Date.now();
  
  // State reconciliation callback
  private onReconnectCallback: (() => Promise<void>) | null = null;

  /**
   * Connect to WebSocket for a specific game
   * CRITICAL: Prevents duplicate connections
   */
  connect(gameId: string): Promise<void> {
    // GUARD: Prevent duplicate connections
    if (this.isConnected() && this.gameId === gameId) {
      console.log('Already connected to game:', gameId);
      return Promise.resolve();
    }

    // GUARD: Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.log('Connection already in progress');
      return Promise.reject(new Error('Connection already in progress'));
    }

    return new Promise((resolve, reject) => {
      const user = tokenStorage.getUser();
      if (!user) {
        reject(new Error('No authenticated user'));
        return;
      }

      // Disconnect existing connection before creating new one
      if (this.ws) {
        this.disconnect();
      }

      this.gameId = gameId;
      this.userId = user.id.toString();
      this.isConnecting = true;
      this.isIntentionalDisconnect = false;

      // Build WebSocket URL with query parameters
      const wsUrl = `${ENV.WS_BASE_URL}/ws/game?gameId=${gameId}&userId=${user.id}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected to game:', gameId);
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.lastPongReceived = Date.now();

          // Send JOIN message
          this.sendMessage({
            type: 'JOIN',
            gameId,
            userId: this.userId!,
          });

          // Start heartbeat
          this.startHeartbeat();

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
this.stopHeartbeat();
          
        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          
          // Only attempt reconnect if not intentionally disconnected
          if (!this.isIntentionalDisconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   * CRITICAL: Mark as intentional to prevent reconnect attempts
   */
  disconnect(): void {
    this.isIntentionalDisconnect = true;
this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.gameId = null;
    this.userId = null;
    this.messageHandlers = [];
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.onReconnectCallback = null;
  }

  /**
   * Send a message to the server
   * GUARD: Only send if connection is open
   */
  sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected - cannot send message');
    }
  }

  /**
   * Send a move
   * CRITICAL: Include promotion field even if undefined (backend expects it)
   */
  sendMove(from: string, to: string, promotion?: string): void {
    this.sendMessage({
      type: 'MOVE',
      data: { from, to, promotion },
    });
  }

  /**
   * Send resign
   */
  sendResign(): void {
    this.sendMessage({
      type: 'RESIGN',
      gameId: this.gameId!,
      userId: this.userId!,
    });
  }

  /**
   * Send chat message
   */
  sendChatMessage(message: string): void {
    if (!message.trim()) {
      return;
    }
    
    this.sendMessage({
      type: 'CHAT_MESSAGE',
      data: {
        message: message.trim(),
      },
    });
  }

  /**
   * Subscribe to messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Handle incoming message
   * CRITICAL: Route messages safely with defensive guards
   */
  private handleMessage(message: WebSocketMessage): void {
    // DEFENSIVE GUARD: Validate message structure
    if (!message || typeof message.type !== 'string') {
      console.error('Invalid WebSocket message structure:', message);
      return;
    }

    // Handle PONG responses for heartbeat
    if (message.type === 'PONG') {
      this.lastPongReceived = Date.now();
      return; // Don't notify handlers of heartbeat messages
    }

    // Log all messages for debugging
    console.log('[WS] Received:', message.type, message);

    // Notify all handlers
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (
      !this.gameId ||
      this.reconnectAttempts >= this.maxReconnectAttempts ||
      this.isIntentionalDisconnect
    ) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect(this.gameId!);
        
        // On successful reconnect, trigger state reconciliation
        if (this.onReconnectCallback) {
          console.log('WebSocket reconnected - reconciling state...');
          await this.onReconnectCallback();
        }
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Start heartbeat mechanism to detect silent disconnections
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      // Check if we received a PONG recently
      const timeSinceLastPong = Date.now() - this.lastPongReceived;
      
      if (timeSinceLastPong > this.HEARTBEAT_INTERVAL + this.HEARTBEAT_TIMEOUT) {
        console.warn('Heartbeat timeout - connection appears dead');
        this.ws?.close(); // Trigger reconnection
        return;
      }
      
      // Send PING
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'PING' });
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Register callback for state reconciliation after reconnect
   */
  setReconnectCallback(callback: () => Promise<void>): void {
    this.onReconnectCallback = callback;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    isConnected: boolean;
    reconnectAttempts: number;
    timeSinceLastPong: number;
  } {
    return {
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      timeSinceLastPong: Date.now() - this.lastPongReceived,
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const wsService = new GameWebSocketService();
