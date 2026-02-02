import { Chess, Square } from 'chess.js';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChessBoard } from '@/app/components/ChessBoard';
import { PlayerInfo } from '@/app/components/PlayerInfo';
import { MoveHistory } from '@/app/components/MoveHistory';
import { GameControls } from '@/app/components/GameControls';
import { ChatBox, type ChatMessage } from '@/app/components/ChatBox';
import { gameService } from '@/services/gameService';
import { wsService } from '@/services/websocketService';
import { stompChatService } from '@/services/stompChatService';
import { authService } from '@/services/authService';
import { logger } from '@/services/logger';
import type { GameResponse, MoveInfo } from '@/types/game';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  isGameStartMessage,
  isGameUpdateMessage,
  isGameStateMessage,
  isPlayerMoveMessage,
  isGameEndMessage,
  isErrorMessage,
  isClockUpdateMessage,
  isTimeoutMessage,
  isMoveRejectedMessage,
} from '@/utils/websocketValidation';

interface CapturedPiece {
  type: string;
  color: string;
}

interface Move {
  white?: string;
  black?: string;
  moveNumber: number;
}

export const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [game, setGame] = useState<Chess | null>(null);
  const [gameData, setGameData] = useState<GameResponse | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [whiteCaptured, setWhiteCaptured] = useState<CapturedPiece[]>([]);
  const [blackCaptured, setBlackCaptured] = useState<CapturedPiece[]>([]);
  const [whiteTime, setWhiteTime] = useState<number | null>(null);
  const [blackTime, setBlackTime] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [chatConnected, setChatConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageIds, setMessageIds] = useState<Set<number>>(new Set());

  // CRITICAL: Track if moves are allowed based on game status
  const canMakeMove = gameData?.status === 'IN_PROGRESS';

  // State reconciliation function
  const reconcileGameState = useCallback(async () => {
    logger.network('Reconciling game state after reconnect', { gameId });
    try {
      await loadGame();
      logger.info('State reconciliation complete');
    } catch (error) {
      logger.error('State reconciliation failed', error);
    }
  }, [gameId]);

  // Load game from backend
  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided');
      setLoading(false);
      return;
    }

    loadGame();
  }, [gameId]);

  const loadGame = async () => {
    if (!gameId) return;

    try {
      setLoading(true);
      setError('');
      const data = await gameService.getGame(Number(gameId));
      setGameData(data);

      // Load FEN position
      const chessInstance = new Chess(data.fenPosition);
      setGame(chessInstance);

      // Initialize clocks from backend data (already in seconds)
      if (data.whiteTimeRemaining !== null) {
        setWhiteTime(data.whiteTimeRemaining);
      }
      if (data.blackTimeRemaining !== null) {
        setBlackTime(data.blackTimeRemaining);
      }

      // Update game state
      setGameStatus(getGameStatusText(data));
      
      // Initialize move history from backend data (NOT chess.js history)
      // Backend sends complete move list with SAN notation
      if (data.moves && data.moves.length > 0) {
        setMoveHistory(convertBackendMovesToUI(data.moves));
      } else {
        setMoveHistory([]);
      }
      updateCapturedPieces();
      
      // Load chat history
      try {
        const chatHistory = await gameService.getChatHistory(Number(gameId));
        const historyMessages = chatHistory.messages.map(msg => ({
          id: msg.id,
          userId: msg.userId,
          username: msg.username,
          message: msg.message,
          timestamp: msg.timestamp,
        }));
        setChatMessages(historyMessages);
        
        // Track message IDs for de-duplication
        const ids = new Set(historyMessages.filter(m => m.id).map(m => m.id!));
        setMessageIds(ids);
      } catch (err) {
        logger.error('Failed to load chat history', err);
      }

      // Clear loading state - data successfully loaded
      setLoading(false);

      // Register state reconciliation callback BEFORE connecting
      wsService.setReconnectCallback(reconcileGameState);
      
      // Connect to WebSocket ONLY ONCE
      if (!wsService.isConnected()) {
        await wsService.connect(gameId);
        setWsConnected(true);
      }

      // Subscribe to messages with DEFENSIVE HANDLING and TYPE GUARDS
      wsService.onMessage((message) => {
        logger.network('Received WS message', { type: message.type });

        // Use type guards for safe message handling
        if (isGameStartMessage(message)) {
          logger.game('Game started', message.data);
          setGameData(message.data);
          setGame(new Chess(message.data.fenPosition));
          setGameStatus(getGameStatusText(message.data));
          return;
        }

        if (isGameUpdateMessage(message)) {
          logger.game('Game state updated', message.data);
          setGameData(message.data);
          setGame(new Chess(message.data.fenPosition));
          setGameStatus(getGameStatusText(message.data));
          return;
        }

        if (isGameStateMessage(message)) {
          logger.game('Game state received (resume/reconnect)', message.data);
          setGameData(message.data);
          setGame(new Chess(message.data.fenPosition));
          
          // Initialize clocks if present
          if (message.data.whiteTimeRemaining !== null) {
            setWhiteTime(message.data.whiteTimeRemaining);
          }
          if (message.data.blackTimeRemaining !== null) {
            setBlackTime(message.data.blackTimeRemaining);
          }
          
          setGameStatus(getGameStatusText(message.data));
          setLoading(false); // CRITICAL: Clear loading state
          updateMoveHistory();
          updateCapturedPieces();
          return;
        }


        if (isGameEndMessage(message)) {
          logger.game('Game ended', message.data);
          toast.info('Game Over', {
            description: message.data.reason,
          });
          setGameStatus(`Game Over: ${message.data.reason}`);
          loadGame(); // Reload to get final state
          return;
        }

        if (isClockUpdateMessage(message)) {
          // Backend sends time in milliseconds, convert to seconds
          setWhiteTime(Math.floor(message.data.whiteTimeMs / 1000));
          setBlackTime(Math.floor(message.data.blackTimeMs / 1000));
          return;
        }

        if (isErrorMessage(message)) {
          logger.error('WebSocket error', message.data.message);
          setError(message.data.message);
          return;
        }

        if (isTimeoutMessage(message)) {
          logger.game('Game timeout', message.data);
          toast.info('Game Over', {
            description: `${message.data.winner} wins by timeout`,
          });
          setGameStatus(`Game Over: ${message.data.winner} wins by timeout`);
          loadGame(); // Reload to get final state
          return;
        }

        if (isMoveRejectedMessage(message)) {
          logger.warn('Move rejected', message.data.reason);
          toast.warning('Move Rejected', {
            description: message.data.reason,
          });
          return;
        }

        // Handle legacy message types without type guards for backward compatibility
        switch (message.type) {
          case 'CONNECTED':
            logger.network('Connected to game room', { gameId });
            break;

          case 'GAME_STATE':
            // Backend sends full game state for resume/reconnect
            // This is already handled by isGameStateMessage type guard above
            // If we reach here, the type guard didn't catch it
            logger.debug('GAME_STATE fallback handler', message.data);
            if (message.data) {
              // Backend sends 'fen' not 'fenPosition'
              const fenString = message.data.fen || message.data.fenPosition || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
              setGame(new Chess(fenString));
              
              // Update game data if available
              if (message.data.whiteTimeRemaining !== undefined) {
                setWhiteTime(message.data.whiteTimeRemaining);
              }
              if (message.data.blackTimeRemaining !== undefined) {
                setBlackTime(message.data.blackTimeRemaining);
              }
              
              setGameStatus(message.data.status === 'IN_PROGRESS' ? "White's turn" : message.data.status);
              setLoading(false);
              updateMoveHistory();
              updateCapturedPieces();
              
              // Load full game data to get player names and other info
              loadGame();
            }
            break;

          case 'USER_JOINED':
            logger.network('User joined game', { userId: message.userId });
            loadGame(); // Backend sends this when game state changes (join, resign, etc.)
            break;

          case 'USER_LEFT':
            logger.network('User left game', { userId: message.userId });
            // Optionally show a notification to the other player
            break;

          case 'PLAYER_MOVE':
            // Backend sends opponent's move
            if (message.data) {
              handleMoveResult(message.data);
            }
            break;

          case 'MOVE_RESULT':
            logger.debug('MOVE_RESULT received', message);
            if (message.data) {
              handleMoveResult(message.data);
            } else {
              logger.error('MOVE_RESULT missing data', message);
            }
            break;

          case 'MESSAGE':
            // Generic broadcast message - check if it contains move data
            logger.debug('MESSAGE received', { message, data: (message as any).data });
            if ((message as any).data && (message as any).data.fen) {
              // This is actually a move update
              logger.debug('MESSAGE contains FEN, treating as move result');
              handleMoveResult((message as any).data);
            }
            break;

          case 'CHAT_MESSAGE':
            logger.debug('Chat message received', message.data);
            if (message.data) {
              setChatMessages(prev => [...prev, {
                id: message.data.id,
                userId: message.data.userId,
                username: message.data.username,
                message: message.data.message,
                timestamp: message.data.timestamp,
              }]);
            }
            break;

          case 'CLOCK_UPDATE':
            // Clock updates handled separately - ignore to reduce noise
            break;

          case 'ERROR':
            logger.error('WebSocket error', (message as any).message);
            break;

          default:
            logger.warn('Unhandled message type', { type: message.type });
        }
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      logger.error('Failed to load game', error);
      setError(error.message || 'Failed to load game');
      setLoading(false);
      setWsConnected(false);
    }
  };

  // Connect to STOMP chat when game loads
  useEffect(() => {
    if (!gameId) return;

    let mounted = true;

    const connectChat = async () => {
      try {
        await stompChatService.connect(gameId);
        if (!mounted) return;
        
        setChatConnected(true);
        logger.info('STOMP chat connected');

        // Subscribe to chat messages (handler will persist until disconnect)
        stompChatService.onMessage((chatMessage) => {
          logger.debug('Chat message received from backend:', {
            id: chatMessage.id,
            userId: chatMessage.userId,
            username: chatMessage.username,
            message: chatMessage.message,
          });
          
          // De-duplicate using functional setState to access current state
          setChatMessages(prev => {
            setMessageIds(currentIds => {
              // Check if already exists
              if (chatMessage.id && currentIds.has(chatMessage.id)) {
                logger.debug('Duplicate chat message ignored:', chatMessage.id);
                return currentIds;
              }
              
              // Add new message ID
              if (chatMessage.id) {
                return new Set([...currentIds, chatMessage.id]);
              }
              return currentIds;
            });
            
            // Only add if not duplicate (check again in case of race condition)
            if (chatMessage.id) {
              const exists = prev.some(m => m.id === chatMessage.id);
              if (exists) return prev;
            }
            
            return [...prev, chatMessage];
          });
        });

        // Subscribe to connection status
        stompChatService.onStatusChange((connected) => {
          if (mounted) {
            setChatConnected(connected);
            logger.info('Chat connection status:', connected);
          }
        });
      } catch (err) {
        logger.error('Failed to connect to chat', err);
        if (mounted) {
          setChatConnected(false);
        }
      }
    };

    connectChat();

    return () => {
      mounted = false;
      // Don't disconnect here - will be handled by global cleanup
    };
  }, [gameId]);

  // Cleanup WebSocket and STOMP on unmount
  useEffect(() => {
    return () => {
      wsService.disconnect();
      stompChatService.disconnect();
      logger.info('Disconnected from WebSocket and STOMP chat');
    };
  }, []);

  // Handle WebSocket move result
  const handleMoveResult = (data: any) => {
    // DEFENSIVE: Validate data structure - accept both fen and fenAfterMove
    const fen = data.fenAfterMove || data.fen;
    if (!data || !fen) {
      logger.error('Invalid MOVE_RESULT data', data);
      return;
    }

    logger.game('Handling move result', data);
    
    const chessInstance = new Chess(fen);
    setGame(chessInstance);
    
    // CRITICAL: Update ALL fields from WebSocket message (authoritative source)
    // Backend sends currentTurn, status, times, etc. in the move payload
    if (gameData) {
      const updatedGameData = {
        ...gameData,
        fenPosition: fen,
        currentTurn: data.currentTurn || (chessInstance.turn() === 'w' ? 'WHITE' : 'BLACK'),
        status: data.status || gameData.status,
        whiteTimeRemaining: data.whiteTimeRemaining ?? gameData.whiteTimeRemaining,
        blackTimeRemaining: data.blackTimeRemaining ?? gameData.blackTimeRemaining,
        moves: data.moves || gameData.moves,
      };
      setGameData(updatedGameData);
      
      // Update clocks from WebSocket data
      if (data.whiteTimeRemaining !== undefined && data.whiteTimeRemaining !== null) {
        setWhiteTime(data.whiteTimeRemaining);
      }
      if (data.blackTimeRemaining !== undefined && data.blackTimeRemaining !== null) {
        setBlackTime(data.blackTimeRemaining);
      }
      
      // Update move history from backend data (if provided)
      if (data.moves && data.moves.length > 0) {
        setMoveHistory(convertBackendMovesToUI(data.moves));
      } else {
        updateMoveHistory(); // Fallback to chess.js history
      }
    } else {
      updateMoveHistory(); // Fallback if no gameData
    }
    updateCapturedPieces();
    
    // Update game status
    if (data.isCheckmate) {
      setGameStatus('Checkmate!');
    } else if (data.isCheck) {
      setGameStatus('Check!');
    } else {
      setGameStatus('');
    }
  };

  // Handle game state update
  const handleGameStateUpdate = (data: any) => {
    // DEFENSIVE: Validate data structure
    if (!data || !data.fen) {
      logger.error('Invalid GAME_STATE data', data);
      return;
    }

    const chessInstance = new Chess(data.fen);
    setGame(chessInstance);
    
    // Update game data with new state
    if (gameData) {
      const updatedGameData = {
        ...gameData,
        fenPosition: data.fen,
        currentTurn: data.currentTurn || (chessInstance.turn() === 'w' ? 'WHITE' : 'BLACK'),
        status: data.status || gameData.status,
        whiteTimeRemaining: data.whiteTimeRemaining ?? gameData.whiteTimeRemaining,
        blackTimeRemaining: data.blackTimeRemaining ?? gameData.blackTimeRemaining,
      };
      setGameData(updatedGameData);
      
      // Update clocks
      if (data.whiteTimeRemaining !== undefined && data.whiteTimeRemaining !== null) {
        setWhiteTime(data.whiteTimeRemaining);
      }
      if (data.blackTimeRemaining !== undefined && data.blackTimeRemaining !== null) {
        setBlackTime(data.blackTimeRemaining);
      }
    }
    
    updateMoveHistory();
    updateCapturedPieces();
  };

  // Handle clock update
  const handleClockUpdate = (data: any) => {
    // DEFENSIVE: Validate required fields exist
    if (!data || typeof data.whiteTimeMs !== 'number' || typeof data.blackTimeMs !== 'number') {
      logger.error('Invalid CLOCK_UPDATE data', data);
      return;
    }

    // Convert milliseconds to seconds
    setWhiteTime(Math.floor(data.whiteTimeMs / 1000));
    setBlackTime(Math.floor(data.blackTimeMs / 1000));
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateMaterialAdvantage = (color: 'w' | 'b'): number => {
    if (!game) return 0;
    
    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
    };

    const captured = color === 'w' ? blackCaptured : whiteCaptured;
    const opponentCaptured = color === 'w' ? whiteCaptured : blackCaptured;

    const ourMaterial = captured.reduce((sum, p) => sum + (pieceValues[p.type] || 0), 0);
    const theirMaterial = opponentCaptured.reduce((sum, p) => sum + (pieceValues[p.type] || 0), 0);

    return ourMaterial - theirMaterial;
  };

  const updateMoveHistory = useCallback(() => {
    if (!game) {
      setMoveHistory([]);
      return;
    }
    
    const history = game.history();
    const moves: Move[] = [];

    for (let i = 0; i < history.length; i += 2) {
      moves.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: history[i],
        black: history[i + 1],
      });
    }

    setMoveHistory(moves);
  }, [game]);

  const updateCapturedPieces = useCallback(() => {
    if (!game) {
      setWhiteCaptured([]);
      setBlackCaptured([]);
      return;
    }
    
    const allPieces = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
    };

    const boardPieces = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = String.fromCharCode(97 + j) + (8 - i) as Square;
        const piece = game.get(square);
        if (piece && piece.type !== 'k') {
          boardPieces[piece.color][piece.type as keyof typeof boardPieces.w]++;
        }
      }
    }

    const whiteCap: CapturedPiece[] = [];
    const blackCap: CapturedPiece[] = [];

    Object.keys(allPieces).forEach((type) => {
      const key = type as keyof typeof allPieces;
      const blackMissing = allPieces[key] - boardPieces.b[key];
      const whiteMissing = allPieces[key] - boardPieces.w[key];

      for (let i = 0; i < blackMissing; i++) {
        whiteCap.push({ type, color: 'b' });
      }
      for (let i = 0; i < whiteMissing; i++) {
        blackCap.push({ type, color: 'w' });
      }
    });

    setWhiteCaptured(whiteCap);
    setBlackCaptured(blackCap);
  }, [game]);

  const handleMove = async (from: Square, to: Square) => {
    if (!gameId || !gameData || !game) return;

    // CRITICAL GUARD: Only allow moves when game status is IN_PROGRESS
    if (gameData.status !== 'IN_PROGRESS') {
      toast.warning('Cannot Move', {
        description: 'Game has not started or is already finished',
      });
      return;
    }

    // Check if it's the current user's turn
    const userColor = getUserColor();
    if (!userColor) {
      toast.warning('Cannot Move', {
        description: 'You are not a player in this game',
      });
      return;
    }

    // Backend uses 'WHITE'/'BLACK', chess.js uses 'w'/'b'
    const currentTurn = game.turn();
    const isWhiteTurn = gameData.currentTurn === 'WHITE';
    const isUserTurn = (userColor === 'white' && isWhiteTurn) || (userColor === 'black' && !isWhiteTurn);

    if (!isUserTurn) {
      toast.warning('Not Your Turn', {
        description: "Wait for your opponent's move",
      });
      return;
    }

    try {
      // Check if this is a pawn promotion move
      const piece = game.get(from);
      const isPawnPromotion = piece && 
                              piece.type === 'p' && 
                              ((piece.color === 'w' && to[1] === '8') || 
                               (piece.color === 'b' && to[1] === '1'));
      
      // Send move via REST API for persistence and validation
      // Backend will validate the move and broadcast via WebSocket
      const moveRequest: any = { from, to };
      
      // Only include promotion for actual pawn promotions
      if (isPawnPromotion) {
        moveRequest.promotion = 'Q';  // Uppercase Q for backend
      }
      
      // Send move and immediately update board with response (prevents flicker)
      const response = await gameService.makeMove(Number(gameId), moveRequest);
      
      // IMMEDIATELY update board with REST response - no waiting for WebSocket
      const chessInstance = new Chess(response.fenPosition);
      setGame(chessInstance);
      
      // CRITICAL: Use currentTurn from backend response (authoritative source)
      // Backend has already calculated and saved the correct turn after the move
      setGameData(response);
      setGameStatus(getGameStatusText(response));
      
      // Update move history from backend response (authoritative source)
      if (response.moves && response.moves.length > 0) {
        setMoveHistory(convertBackendMovesToUI(response.moves));
      } else {
        // Fallback to chess.js history if backend doesn't send moves
        const history = chessInstance.history();
        const moves: Move[] = [];
        for (let i = 0; i < history.length; i += 2) {
          moves.push({
            moveNumber: Math.floor(i / 2) + 1,
            white: history[i],
            black: history[i + 1],
          });
        }
        setMoveHistory(moves);
      }
      updateCapturedPieces();
      
      // WebSocket will also send update, but state is already correct (idempotent)
    } catch (error: unknown) {
      const err = error as { message?: string };
      logger.error('Move failed', err);
      toast.error('Invalid Move', {
        description: err.message || 'This move is not allowed',
      });
    }
  };

  const handleResign = async () => {
    if (!gameId) return;

    // Use toast promise for confirmation-like experience
    const confirmed = window.confirm('Are you sure you want to resign?');
    if (!confirmed) return;

    try {
      const result = await toast.promise(
        gameService.resignGame(Number(gameId)),
        {
          loading: 'Resigning...',
          success: 'You have resigned from the game',
          error: 'Failed to resign',
        }
      );
      
      // Update game state immediately with resignation result
      if (result) {
        setGameData(result);
        setGameStatus(getGameStatusText(result));
        
        // Reload the game to get the final state
        await loadGame();
      }
    } catch (error) {
      logger.error('Resign failed', error);
    }
  };

  const handleSendChatMessage = (message: string) => {
    if (!message.trim()) {
      return;
    }

    if (!chatConnected) {
      toast.error('Chat not connected', {
        description: 'Please wait for connection',
      });
      return;
    }
    
    try {
      stompChatService.sendMessage(message);
      logger.debug('Chat message sent via STOMP', { message });
    } catch (error) {
      logger.error('Failed to send chat message', error);
      toast.error('Failed to send message', {
        description: 'Please try again',
      });
    }
  };

  const getUserColor = (): 'white' | 'black' | null => {
    if (!gameData || !currentUser) return null;
    // CRITICAL: Backend uses whitePlayer/blackPlayer objects with id property
    if (gameData.whitePlayer?.id === currentUser.id) return 'white';
    if (gameData.blackPlayer?.id === currentUser.id) return 'black';
    return null;
  };

  // Convert backend MoveInfo array to UI Move format for MoveHistory component
  const convertBackendMovesToUI = (backendMoves: MoveInfo[]): Move[] => {
    const moves: Move[] = [];
    for (let i = 0; i < backendMoves.length; i += 2) {
      moves.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: backendMoves[i]?.san,
        black: backendMoves[i + 1]?.san,
      });
    }
    return moves;
  };

  const getGameStatusText = (data: any): string => {
    if (!data) return '';
    
    if (data.status === 'CHECKMATE') {
      return data.winnerId === currentUser?.id ? 'You won by checkmate!' : 'You lost by checkmate';
    }
    if (data.status === 'STALEMATE') return 'Stalemate - Draw';
    if (data.status === 'DRAW_AGREEMENT') return 'Game drawn by agreement';
    if (data.status === 'DRAW_REPETITION') return 'Draw by threefold repetition';
    if (data.status === 'DRAW_FIFTY_MOVE') return 'Draw by fifty-move rule';
    if (data.status === 'DRAW_INSUFFICIENT_MATERIAL') return 'Draw by insufficient material';
    if (data.status === 'RESIGNATION') {
      // Check if current user is the winner
      if (data.winnerId === currentUser?.id) {
        return 'Opponent resigned - You won!';
      } else {
        return 'You resigned - Game over';
      }
    }
    if (data.status === 'TIMEOUT') {
      return data.winnerId === currentUser?.id ? 'Opponent ran out of time - You won!' : 'You ran out of time - Game over';
    }
    if (data.status === 'WAITING') return 'Waiting for opponent...';
    if (game && game.isCheck()) return 'Check!';
    return '';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="ml-3 text-white">Loading game...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <Alert className="bg-red-900/20 border-red-600">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex flex-col gap-2">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError('');
                  loadGame();
                }}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors w-fit"
              >
                <RefreshCw className="inline w-4 h-4 mr-2" />
                Retry
              </button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-white">No game found</p>
      </div>
    );
  }

  const userColor = getUserColor();
  const waitingForOpponent = gameData.status === 'WAITING' || !gameData.whitePlayer || !gameData.blackPlayer;

  return (
    <div className="min-h-screen bg-[#0B1020] flex flex-col">
      {/* ========== TOP STATUS BAR ========== */}
      <div className="bg-[#141B2D] border-b border-slate-800/50 flex-shrink-0">
        <div className="px-6 py-2">
          <div className="flex items-center justify-between text-sm">
            {/* Live Status */}
            <div className="flex items-center gap-4">
              {wsConnected ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 font-semibold">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-yellow-400 font-semibold">Reconnecting...</span>
                </div>
              )}
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono">Game #{gameId}</span>
            </div>

            {/* Match Type */}
            <div className="text-slate-200 font-bold">Ranked • 10+0</div>

            {/* Clocks */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-medium">WHITE</span>
                <span className="text-white font-mono font-bold text-base">{formatTime(whiteTime)}</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-medium">BLACK</span>
                <span className="text-white font-mono font-bold text-base">{formatTime(blackTime)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting Banner */}
        {waitingForOpponent && (
          <div className="bg-yellow-500/10 border-t border-yellow-500/20 py-1.5">
            <p className="text-yellow-400 text-center text-sm font-semibold">⏳ Waiting for opponent...</p>
          </div>
        )}
      </div>

      {/* ========== MAIN ARENA (3-Column Layout) ========== */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: Move History */}
        <div className="w-[280px] bg-[#141B2D] border-r border-slate-800/50 flex-shrink-0">
          <MoveHistory moves={moveHistory} currentMove={moveHistory.length} />
        </div>

        {/* CENTER: Board Zone */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 px-8 overflow-y-auto">
          {/* Top Player (Opponent) - Always shows opponent */}
          <div className="w-[640px] mb-2">
            {userColor === 'white' ? (
              <PlayerInfo
                name={gameData.blackPlayer?.username || 'Opponent'}
                rating={gameData.blackPlayer?.rating || 1200}
                timeRemaining={formatTime(blackTime)}
                capturedPieces={blackCaptured}
                materialAdvantage={calculateMaterialAdvantage('b')}
                isActive={gameData.currentTurn === 'BLACK'}
                isCurrentUser={false}
              />
            ) : (
              <PlayerInfo
                name={gameData.whitePlayer?.username || 'Opponent'}
                rating={gameData.whitePlayer?.rating || 1200}
                timeRemaining={formatTime(whiteTime)}
                capturedPieces={whiteCaptured}
                materialAdvantage={calculateMaterialAdvantage('w')}
                isActive={gameData.currentTurn === 'WHITE'}
                isCurrentUser={false}
              />
            )}
          </div>

          {/* Chessboard - HERO */}
          <div className="w-[640px] h-[640px] mb-2 shadow-2xl shadow-blue-500/5">
            <ChessBoard
              game={game}
              onMove={handleMove}
              disabled={!canMakeMove || !userColor || waitingForOpponent}
              flipped={userColor === 'black'}
              userColor={userColor}
            />
          </div>

          {/* Bottom Player (You) - Always shows current user */}
          <div className="w-[640px] mb-3">
            {userColor === 'white' ? (
              <PlayerInfo
                name={gameData.whitePlayer?.username || currentUser?.username || 'You'}
                rating={gameData.whitePlayer?.rating || 1200}
                timeRemaining={formatTime(whiteTime)}
                capturedPieces={whiteCaptured}
                materialAdvantage={calculateMaterialAdvantage('w')}
                isActive={gameData.currentTurn === 'WHITE'}
                isCurrentUser={true}
              />
            ) : (
              <PlayerInfo
                name={gameData.blackPlayer?.username || currentUser?.username || 'You'}
                rating={gameData.blackPlayer?.rating || 1200}
                timeRemaining={formatTime(blackTime)}
                capturedPieces={blackCaptured}
                materialAdvantage={calculateMaterialAdvantage('b')}
                isActive={gameData.currentTurn === 'BLACK'}
                isCurrentUser={true}
              />
            )}
          </div>

          {/* Game Status + Controls */}
          <div className="w-[640px] flex gap-3">
            {gameStatus && (
              <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 flex items-center justify-center">
                <span className="text-blue-300 font-bold text-sm">{gameStatus}</span>
              </div>
            )}
            <div className={gameStatus ? 'flex-1' : 'w-full'}>
              <GameControls
                onResign={handleResign}
                onOfferDraw={() => toast.info('Coming Soon', {
                  description: 'Draw offers feature is under development',
                })}
                canResign={canMakeMove}
                canOfferDraw={canMakeMove}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Chat */}
        <div className="w-[280px] bg-[#141B2D] border-l border-slate-800/50 flex-shrink-0">
          <ChatBox
            messages={chatMessages}
            currentUserId={currentUser?.id || 0}
            onSendMessage={handleSendChatMessage}
            disabled={!chatConnected || !canMakeMove}
            chatConnected={chatConnected}
          />
        </div>
      </div>
    </div>
  );
};
