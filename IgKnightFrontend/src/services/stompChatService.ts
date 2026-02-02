/**
 * STOMP Chat Service
 * Handles real-time chat via STOMP over SockJS
 * Connects to game-service (port 8082) for chat functionality
 */

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ENV } from '@/config/env';
import { tokenStorage } from './tokenStorage';
import { logger } from './logger';

export interface ChatMessage {
  id?: number;
  userId: number;
  username: string;
  message: string;
  timestamp: string;
}

type ChatMessageHandler = (message: ChatMessage) => void;
type ConnectionStatusHandler = (connected: boolean) => void;

export class StompChatService {
  private client: Client | null = null;
  private gameId: string | null = null;
  private chatSubscription: StompSubscription | null = null;
  private messageHandlers: ChatMessageHandler[] = [];
  private statusHandlers: ConnectionStatusHandler[] = [];
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  /**
   * Connect to STOMP WebSocket for chat
   */
  connect(gameId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = tokenStorage.getUser();
      if (!user) {
        reject(new Error('No authenticated user'));
        return;
      }

      // Guard: Prevent duplicate connections
      if (this.isConnected() && this.gameId === gameId) {
        logger.info('Already connected to chat for game:', gameId);
        resolve();
        return;
      }

      // Guard: Prevent multiple simultaneous connection attempts
      if (this.isConnecting) {
        logger.warn('Chat connection already in progress');
        reject(new Error('Connection already in progress'));
        return;
      }

      this.gameId = gameId;
      this.isConnecting = true;

      // Disconnect existing connection
      if (this.client) {
        this.disconnect();
      }

      // Create STOMP client with SockJS
      logger.info('Connecting STOMP chat with user:', { id: user.id, username: user.username });
      
      this.client = new Client({
        webSocketFactory: () => new SockJS(`${ENV.STOMP_WS_URL}/ws/chess`),
        
        connectHeaders: {
          'X-User-Id': user.id.toString(),
          'X-Username': user.username,
        },

        debug: (str) => {
          if (ENV.isDevelopment) {
            logger.debug('[STOMP]', str);
          }
        },

        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: () => {
          logger.info('STOMP chat connected for game:', gameId);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyStatusHandlers(true);

          // Subscribe to chat topic
          this.subscribeToChatTopic(gameId);
          
          resolve();
        },

        onStompError: (frame) => {
          logger.error('STOMP error:', frame.headers['message']);
          logger.error('Details:', frame.body);
          this.isConnecting = false;
          this.notifyStatusHandlers(false);
          reject(new Error(frame.headers['message'] || 'STOMP connection error'));
        },

        onWebSocketClose: () => {
          logger.warn('STOMP WebSocket closed');
          this.isConnecting = false;
          this.notifyStatusHandlers(false);

          // Auto-reconnect logic
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
              if (this.gameId) {
                this.connect(this.gameId);
              }
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        },

        onWebSocketError: (event) => {
          logger.error('STOMP WebSocket error:', event);
          this.isConnecting = false;
          this.notifyStatusHandlers(false);
        },
      });

      // Activate the client
      this.client.activate();
    });
  }

  /**
   * Subscribe to chat topic for the game
   */
  private subscribeToChatTopic(gameId: string): void {
    if (!this.client || !this.client.connected) {
      logger.error('Cannot subscribe: STOMP client not connected');
      return;
    }

    const topic = `/topic/game/${gameId}/chat`;
    
    this.chatSubscription = this.client.subscribe(topic, (message: IMessage) => {
      try {
        const chatMessage: ChatMessage = JSON.parse(message.body);
        logger.debug('Chat message received:', chatMessage);
        this.notifyMessageHandlers(chatMessage);
      } catch (error) {
        logger.error('Failed to parse chat message:', error);
      }
    });

    logger.info('Subscribed to chat topic:', topic);
  }

  /**
   * Send a chat message
   */
  sendMessage(message: string): void {
    if (!this.client || !this.client.connected) {
      logger.error('Cannot send message: STOMP client not connected');
      throw new Error('Chat not connected');
    }

    if (!this.gameId) {
      logger.error('Cannot send message: No game ID');
      throw new Error('No game ID');
    }

    if (!message.trim()) {
      return;
    }

    const destination = `/app/game/${this.gameId}/chat`;
    const payload = JSON.stringify({ message: message.trim() });

    try {
      this.client.publish({
        destination,
        body: payload,
      });
      logger.debug('Chat message sent:', message);
    } catch (error) {
      logger.error('Failed to send chat message:', error);
      throw error;
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: ChatMessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Register a connection status handler
   */
  onStatusChange(handler: ConnectionStatusHandler): void {
    this.statusHandlers.push(handler);
  }

  /**
   * Notify all message handlers
   */
  private notifyMessageHandlers(message: ChatMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        logger.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Notify all status handlers
   */
  private notifyStatusHandlers(connected: boolean): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        logger.error('Error in status handler:', error);
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client !== null && this.client.connected;
  }

  /**
   * Disconnect from STOMP
   */
  disconnect(): void {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
      this.chatSubscription = null;
    }

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.gameId = null;
    this.messageHandlers = [];
    this.statusHandlers = [];
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.notifyStatusHandlers(false);
    
    logger.info('STOMP chat disconnected');
  }
}

// Export singleton instance
export const stompChatService = new StompChatService();
