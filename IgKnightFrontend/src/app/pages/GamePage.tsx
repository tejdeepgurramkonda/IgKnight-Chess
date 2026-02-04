import { useState, useEffect, useCallback, useRef } from 'react';
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
import type { Square, BoardPosition } from '@/types/chess';
import { parseFenForDisplay } from '@/types/chess';
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

/**
 * GamePage - BACKEND-DRIVEN CHESS CLIENT
 * 
 * ZERO CHESS LOGIC - Pure rendering and event handling
 * Backend is the SOLE source of truth for:
 * - Legal moves
 * - Game state
 * - Move validation
 * - Check/checkmate detection
 * - All chess rules
 */
export const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  // Backend state (authoritative - NEVER modify locally)
  const [gameData, setGameData] = useState<GameResponse | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  
  // UI state (derived from backend)
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
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
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const lastClockTickRef = useRef<number | null>(null);

  const normalizedTurn = (gameData?.currentTurn || '').toString().toUpperCase();
  const isWhiteTurn = normalizedTurn.startsWith('W');
  const isBlackTurn = normalizedTurn.startsWith('B');

  // Local clock ticking between server updates
  useEffect(() => {
    if (!gameData || gameData.status !== 'IN_PROGRESS') {
      lastClockTickRef.current = null;
      return;
    }

    lastClockTickRef.current = Date.now();

    const interval = setInterval(() => {
      if (!lastClockTickRef.current) return;

      const now = Date.now();
      const deltaSeconds = Math.floor((now - lastClockTickRef.current) / 1000);
      if (deltaSeconds <= 0) return;

      lastClockTickRef.current = now;

      if (isWhiteTurn) {
        setWhiteTime((prev) => (prev !== null ? Math.max(0, prev - deltaSeconds) : prev));
      }
      if (isBlackTurn) {
        setBlackTime((prev) => (prev !== null ? Math.max(0, prev - deltaSeconds) : prev));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameData?.status, isWhiteTurn, isBlackTurn]);

  // CRITICAL: Trust only backend for game rules
  const canMakeMove = gameData?.status === 'IN_PROGRESS';

  // Update captured pieces from FEN (display only)
  const updateCapturedPieces = useCallback((fenPosition: string) => {
    if (!fenPosition) {
      setWhiteCaptured([]);
      setBlackCaptured([]);
      return;
    }
    
    const boardPosition = parseFenForDisplay(fenPosition);
    
    const allPieces = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
    };

    const boardPieces = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

    Object.values(boardPosition).forEach(piece => {
      if (piece && piece.type !== 'k') {
        boardPieces[piece.color][piece.type as keyof typeof boardPieces.w]++;
      }
    });

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
  }, []);

  // State reconciliation - fetch full state from backend
  const reconcileGameState = useCallback(async () => {
    logger.network('Reconciling game state after reconnect', { gameId });
    try {
      // Need to manually reload instead of calling loadGame to avoid circular dependency
      if (!gameId) return;
      
      const data = await gameService.getGame(Number(gameId));
      console.log('[DEBUG] reconcileGameState - Loaded game data:', data);
      console.log('[DEBUG] reconcileGameState - FEN position:', data.fenPosition);
      setGameData(data);

      // Update clocks from backend
      if (data.whiteTimeRemaining !== null) {
        setWhiteTime(data.whiteTimeRemaining);
      }
      if (data.blackTimeRemaining !== null) {
        setBlackTime(data.blackTimeRemaining);
      }

      // Update game state
      setGameStatus(getGameStatusText(data));
      
      // Update move history from backend
      if (data.moves && data.moves.length > 0) {
        setMoveHistory(convertBackendMovesToUI(data.moves));
        // Track last move for highlighting
        if (data.moves.length >= 1) {
          const lastBackendMove = data.moves[data.moves.length - 1];
          setLastMove({
            from: lastBackendMove.fromSquare || '',
            to: lastBackendMove.toSquare || ''
          });
        }
      } else {
        setMoveHistory([]);
        setLastMove(null);
      }
      
      // Update captured pieces from FEN
      updateCapturedPieces(data.fenPosition);
      
      logger.info('State reconciliation complete');
    } catch (error) {
      logger.error('State reconciliation failed', error);
    }
  }, [gameId]);

  // Load game from backend (SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided');
      setLoading(false);
      return;
    }

    loadGame();
  }, [gameId]);

  const loadGame = useCallback(async () => {
    if (!gameId) return;

    try {
      setLoading(true);
      setError('');
      const data = await gameService.getGame(Number(gameId));
      console.log('[DEBUG] loadGame - Received game data:', data);
      console.log('[DEBUG] loadGame - FEN position:', data.fenPosition);
      setGameData(data);

      // Update clocks from backend
      if (data.whiteTimeRemaining !== null) {
        setWhiteTime(data.whiteTimeRemaining);
      }
      if (data.blackTimeRemaining !== null) {
        setBlackTime(data.blackTimeRemaining);
      }

      // Update game state
      setGameStatus(getGameStatusText(data));
      
      // Update move history from backend
      if (data.moves && data.moves.length > 0) {
        setMoveHistory(convertBackendMovesToUI(data.moves));
        // Track last move for highlighting
        if (data.moves.length >= 1) {
          const lastBackendMove = data.moves[data.moves.length - 1];
          setLastMove({
            from: lastBackendMove.fromSquare || '',
            to: lastBackendMove.toSquare || ''
          });
        }
      } else {
        setMoveHistory([]);
        setLastMove(null);
      }
      updateCapturedPieces(data.fenPosition);
      
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
        
        const ids = new Set(historyMessages.filter(m => m.id).map(m => m.id!));
        setMessageIds(ids);
      } catch (err) {
        logger.error('Failed to load chat history', err);
      }

      setLoading(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      logger.error('Failed to load game', error);
      setError(error.message || 'Failed to load game');
      setLoading(false);
      setWsConnected(false);
    }
  }, [gameId, updateCapturedPieces]);

  // Handle move result from backend (WebSocket update)
  const handleMoveResult = useCallback((data: any) => {
    // Handle different message formats from WebSocket
    // MOVE_RESULT format: { from, to, fen, nextTurn, piece, san, isCheck, isCheckmate }
    // REST response format: { fenPosition, currentTurn, status, moves, ... }
    const fen = data.fen || data.fenAfterMove || data.fenPosition;
    if (!data || !fen) {
      logger.error('Invalid MOVE_RESULT data', data);
      return;
    }

    logger.game('Handling move result', data);
    console.log('[DEBUG] handleMoveResult - FEN received:', fen);
    console.log('[DEBUG] handleMoveResult - Current gameData.fenPosition:', gameData?.fenPosition);
    
    // Update last move from WebSocket data (from MOVE_RESULT)
    if (data.from && data.to) {
      setLastMove({
        from: data.from,
        to: data.to
      });
    }
    
    // Update game data with backend response
    if (gameData) {
      const updatedGameData = {
        ...gameData,
        fenPosition: fen,
        // Handle both 'nextTurn' (WebSocket) and 'currentTurn' (REST)
        currentTurn: data.nextTurn || data.currentTurn || gameData.currentTurn,
        status: data.status || gameData.status,
        whiteTimeRemaining: data.whiteTimeRemaining ?? gameData.whiteTimeRemaining,
        blackTimeRemaining: data.blackTimeRemaining ?? gameData.blackTimeRemaining,
        moves: data.moves || gameData.moves,
      };
      setGameData(updatedGameData);
      setGameStatus(getGameStatusText(updatedGameData));
      console.log('[DEBUG] handleMoveResult - Updated gameData with FEN:', updatedGameData.fenPosition);
      
      if (data.whiteTimeRemaining !== undefined && data.whiteTimeRemaining !== null) {
        setWhiteTime(data.whiteTimeRemaining);
      }
      if (data.blackTimeRemaining !== undefined && data.blackTimeRemaining !== null) {
        setBlackTime(data.blackTimeRemaining);
      }
      
      // Update move history if full moves array is provided (REST response)
      if (data.moves && data.moves.length > 0) {
        setMoveHistory(convertBackendMovesToUI(data.moves));
        const lastBackendMove = data.moves[data.moves.length - 1];
        setLastMove({
          from: lastBackendMove.fromSquare || lastBackendMove.from || data.from || '',
          to: lastBackendMove.toSquare || lastBackendMove.to || data.to || ''
        });
      } else if (data.san) {
        // If we only have SAN notation (WebSocket MOVE_RESULT), append to existing history
        // This prevents full page reload for better UX
        setMoveHistory(prev => {
          const newHistory = [...prev];
          
          // Determine whose turn it was (opposite of nextTurn, case-insensitive)
          const nextTurnUpper = data.nextTurn?.toUpperCase();
          const wasWhiteTurn = nextTurnUpper === 'BLACK';
          
          if (wasWhiteTurn) {
            // White just moved, black is next
            const lastMove = newHistory[newHistory.length - 1];
            
            if (!lastMove || lastMove.black !== undefined) {
              // Need new move entry (either empty history or last move is complete)
              newHistory.push({
                moveNumber: newHistory.length + 1,
                white: data.san
              });
            } else {
              // Update existing move entry (has move number but no white move yet)
              lastMove.white = data.san;
            }
          } else {
            // Black just moved, white is next
            const lastMove = newHistory[newHistory.length - 1];
            
            if (lastMove && lastMove.white !== undefined && lastMove.black === undefined) {
              // Update current entry with black's move
              lastMove.black = data.san;
            } else {
              // Create new entry (shouldn't happen, but handle it)
              newHistory.push({
                moveNumber: newHistory.length + 1,
                black: data.san
              });
            }
          }
          
          return newHistory;
        });
      }
    }
    updateCapturedPieces(fen);
    
    if (data.isCheckmate) {
      setGameStatus('Checkmate!');
    } else if (data.isCheck) {
      setGameStatus('Check!');
    } else {
      setGameStatus('');
    }
  }, [gameData, updateCapturedPieces]);

  // Connect to WebSocket and subscribe to game messages
  useEffect(() => {
    if (!gameId) return;

    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const initWebSocket = async () => {
      try {
        // Register state reconciliation callback
        wsService.setReconnectCallback(reconcileGameState);
        
        // Connect to WebSocket
        if (!wsService.isConnected()) {
          await wsService.connect(gameId);
          if (!mounted) return;
          setWsConnected(true);
        }

        // Subscribe to WebSocket messages (CRITICAL: Only subscribe ONCE)
        unsubscribe = wsService.onMessage((message) => {
          logger.network('Received WS message', { type: message.type });

          // Fallback: if message carries a fen update, sync board immediately
          if ((message as any)?.data?.fen || (message as any)?.data?.fenPosition) {
            handleMoveResult((message as any).data);
            const statusSource = (message as any).data?.status;
            if (statusSource) {
              setGameStatus(getGameStatusText({ ...gameData, status: statusSource }));
            }
          }

          if (isGameStartMessage(message)) {
            logger.game('Game started', message.data);
            setGameData(message.data);
            setGameStatus(getGameStatusText(message.data));
            return;
          }

          if (isGameUpdateMessage(message)) {
            logger.game('Game state updated', message.data);
            setGameData(message.data);
            setGameStatus(getGameStatusText(message.data));
            return;
          }

          if (isGameStateMessage(message)) {
            logger.game('Game state received (resume/reconnect)', message.data);
            setGameData(message.data);
            
            if (message.data.whiteTimeRemaining !== null) {
              setWhiteTime(message.data.whiteTimeRemaining);
            }
            if (message.data.blackTimeRemaining !== null) {
              setBlackTime(message.data.blackTimeRemaining);
            }
            
            setGameStatus(getGameStatusText(message.data));
            setLoading(false);
            
            if (message.data.moves && message.data.moves.length > 0) {
              setMoveHistory(convertBackendMovesToUI(message.data.moves));
            }
            updateCapturedPieces(message.data.fenPosition);
            return;
          }

          if (isGameEndMessage(message)) {
            logger.game('Game ended', message.data);
            toast.info('Game Over', {
              description: message.data.reason,
            });
            setGameStatus(`Game Over: ${message.data.reason}`);
            loadGame();
            return;
          }

          if (isPlayerMoveMessage(message)) {
            logger.game('Player move received (PLAYER_MOVE or MOVE_RESULT)', message.data);
            // Update game state from move result
            if (message.data) {
              handleMoveResult(message.data);
            }
            // No need to reload - handleMoveResult already updates all state
            return;
          }

          if (isClockUpdateMessage(message)) {
            // Backend sends time in milliseconds, convert to seconds
            const whiteSeconds = Math.floor(message.data.whiteTimeMs / 1000);
            const blackSeconds = Math.floor(message.data.blackTimeMs / 1000);
            setWhiteTime(whiteSeconds);
            setBlackTime(blackSeconds);
            lastClockTickRef.current = Date.now();
            logger.debug('Clock updated', { white: whiteSeconds, black: blackSeconds });
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
            loadGame();
            return;
          }

          if (isMoveRejectedMessage(message)) {
            logger.warn('Move rejected', message.data.reason);
            toast.warning('Move Rejected', {
              description: message.data.reason,
            });
            return;
          }

          // Legacy message handlers
          switch (message.type) {
            case 'CONNECTED':
              logger.network('Connected to game room', { gameId });
              break;

            case 'GAME_STATE':
              if (message.data) {
                setGameData(message.data);
                
                if (message.data.whiteTimeRemaining !== undefined) {
                  setWhiteTime(message.data.whiteTimeRemaining);
                }
                if (message.data.blackTimeRemaining !== undefined) {
                  setBlackTime(message.data.blackTimeRemaining);
                }
                
                setGameStatus(message.data.status === 'IN_PROGRESS' ? "In Progress" : message.data.status);
                setLoading(false);
                
                if (message.data.moves && message.data.moves.length > 0) {
                  setMoveHistory(convertBackendMovesToUI(message.data.moves));
                }
                updateCapturedPieces(message.data.fenPosition);
                loadGame();
              }
              break;

            case 'USER_JOINED':
              logger.network('User joined game', { userId: message.userId });
              loadGame();
              break;

            case 'USER_LEFT':
              logger.network('User left game', { userId: message.userId });
              break;

            case 'PLAYER_MOVE':
            case 'MOVE_RESULT':
              if (message.data) {
                handleMoveResult(message.data);
              }
              break;

            case 'MOVE':
              if ((message as any).data) {
                handleMoveResult((message as any).data);
              }
              break;

            case 'MESSAGE':
              logger.debug('MESSAGE received', { message });
              if ((message as any).data && (message as any).data.fenPosition) {
                handleMoveResult((message as any).data);
              }
              break;

            case 'CHAT_MESSAGE':
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

            default:
              logger.warn('Unhandled message type', { type: message.type });
          }
        });
      } catch (err) {
        logger.error('Failed to connect WebSocket', err);
        if (mounted) {
          setWsConnected(false);
        }
      }
    };

    initWebSocket();

    return () => {
      mounted = false;
      // CRITICAL: Unsubscribe from message handler to prevent duplicates
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [gameId]);

  // Connect to STOMP chat
  useEffect(() => {
    if (!gameId) return;

    let mounted = true;

    const connectChat = async () => {
      try {
        await stompChatService.connect(gameId);
        if (!mounted) return;
        
        setChatConnected(true);
        logger.info('STOMP chat connected');

        stompChatService.onMessage((chatMessage) => {
          setChatMessages(prev => {
            setMessageIds(currentIds => {
              if (chatMessage.id && currentIds.has(chatMessage.id)) {
                logger.debug('Duplicate chat message ignored:', chatMessage.id);
                return currentIds;
              }
              
              if (chatMessage.id) {
                return new Set([...currentIds, chatMessage.id]);
              }
              return currentIds;
            });
            
            if (chatMessage.id) {
              const exists = prev.some(m => m.id === chatMessage.id);
              if (exists) return prev;
            }
            
            return [...prev, chatMessage];
          });
        });

        stompChatService.onStatusChange((connected) => {
          if (mounted) {
            setChatConnected(connected);
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
    };
  }, [gameId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsService.disconnect();
      stompChatService.disconnect();
      logger.info('Disconnected from WebSocket and STOMP chat');
    };
  }, []);

  // Format time display
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate material advantage for display
  const calculateMaterialAdvantage = (color: 'w' | 'b'): number => {
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

  // Handle square selection - fetch legal moves from backend
  const handleSquareSelect = async (square: Square) => {
    if (!gameId || !gameData) return;

    try {
      const response = await gameService.getLegalMoves(Number(gameId), square);
      setLegalMoves(response.legalMoves || []);
      logger.debug('Legal moves fetched from backend', { square, moves: response.legalMoves });
    } catch (error) {
      logger.error('Failed to fetch legal moves', error);
      setLegalMoves([]);
    }
  };

  // Handle move - send to backend for validation
  const handleMove = async (from: Square, to: Square) => {
    if (!gameId || !gameData) return;

    // CRITICAL: Only allow moves when game is IN_PROGRESS
    if (gameData.status !== 'IN_PROGRESS') {
      toast.warning('Cannot Move', {
        description: 'Game has not started or is already finished',
      });
      return;
    }

    const userColor = getUserColor();
    if (!userColor) {
      toast.warning('Cannot Move', {
        description: 'You are not a player in this game',
      });
      return;
    }

    const isWhiteTurn = gameData.currentTurn === 'WHITE';
    const isUserTurn = (userColor === 'white' && isWhiteTurn) || (userColor === 'black' && !isWhiteTurn);

    if (!isUserTurn) {
      toast.warning('Not Your Turn', {
        description: "Wait for your opponent's move",
      });
      return;
    }

    try {
      // Check for pawn promotion
      const boardPosition = parseFenForDisplay(gameData.fenPosition);
      const piece = boardPosition[from];
      const isPawnPromotion = piece && 
                              piece.type === 'p' && 
                              ((piece.color === 'w' && to[1] === '8') || 
                               (piece.color === 'b' && to[1] === '1'));
      
      const moveRequest: any = { from, to };
      
      if (isPawnPromotion) {
        moveRequest.promotion = 'Q';
      }
      
      // Send move to backend - it will validate and update
      const response = await gameService.makeMove(Number(gameId), moveRequest);
      
      // Update state with backend response (authoritative)
      setGameData(response);
      setGameStatus(getGameStatusText(response));
      
      if (response.moves && response.moves.length > 0) {
        setMoveHistory(convertBackendMovesToUI(response.moves));
        const lastBackendMove = response.moves[response.moves.length - 1];
        setLastMove({
          from: lastBackendMove.fromSquare || from,
          to: lastBackendMove.toSquare || to
        });
      }
      updateCapturedPieces(response.fenPosition);
      
      // Clear legal moves after move
      setLegalMoves([]);
    } catch (error: unknown) {
      const err = error as { message?: string };
      logger.error('Move failed', err);
      toast.error('Invalid Move', {
        description: err.message || 'This move is not allowed',
      });
      // Clear legal moves on error
      setLegalMoves([]);
    }
  };

  const handleResign = async () => {
    if (!gameId) return;

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
      
      if (result) {
        setGameData(result);
        setGameStatus(getGameStatusText(result));
        await loadGame();
      }
    } catch (error) {
      logger.error('Resign failed', error);
    }
  };

  const handleSendChatMessage = (message: string) => {
    if (!message.trim()) return;

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
    if (gameData.whitePlayer?.id === currentUser.id) return 'white';
    if (gameData.blackPlayer?.id === currentUser.id) return 'black';
    return null;
  };

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
    <div className="flex-1 bg-[#0B1020] flex flex-col overflow-hidden">
      {/* TOP STATUS BAR */}
      <div className="bg-[#141B2D] border-b border-slate-800/50 flex-shrink-0">
        <div className="px-5 py-1">
          <div className="flex items-center justify-between text-sm">
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

            <div className="text-slate-200 font-bold">Ranked • 10+0</div>

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

        {waitingForOpponent && (
          <div className="bg-yellow-500/10 border-t border-yellow-500/20 py-1.5">
            <p className="text-yellow-400 text-center text-sm font-semibold">⏳ Waiting for opponent...</p>
          </div>
        )}
      </div>

      {/* MAIN ARENA */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Mobile Move History Overlay */}
        {showMoveHistory && (
          <div className="lg:hidden absolute inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowMoveHistory(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-[#141B2D] border-r border-slate-800/50 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 border-b border-slate-700">
                <h3 className="text-white font-semibold">Move History</h3>
                <button onClick={() => setShowMoveHistory(false)} className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <MoveHistory moves={moveHistory} currentMove={moveHistory.length} />
            </div>
          </div>
        )}

        {/* Mobile Chat Overlay */}
        {showChat && (
          <div className="xl:hidden absolute inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowChat(false)}>
            <div className="absolute right-0 top-0 bottom-0 w-[260px] bg-[#141B2D] border-l border-slate-800/50 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 border-b border-slate-700">
                <h3 className="text-white font-semibold">Chat</h3>
                <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[calc(100%-60px)]">
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
        )}
        
        {/* LEFT: Move History */}
        <div className="hidden lg:block w-[280px] max-h-[calc(100vh-80px)] bg-[#141B2D] border-r border-slate-800/50 flex-shrink-0 p-2 mt-2">
          <MoveHistory moves={moveHistory} currentMove={moveHistory.length} />
        </div>

        {/* CENTER: Board Zone */}
        <div className="flex-1 flex flex-col items-center py-2 px-3 overflow-y-auto" style={{ minHeight: 0 }}>
          
          {/* Mobile Toggle Buttons */}
          <div className="w-full max-w-[min(90vw,700px)] flex gap-2 mb-2 lg:hidden">
            <button
              onClick={() => setShowMoveHistory(true)}
              className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Moves ({moveHistory.length})
            </button>
            <button
              onClick={() => setShowChat(true)}
              className="xl:hidden flex-1 bg-slate-700/50 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
            </button>
          </div>

          {/* Top Player (Opponent) */}
          <div className="w-full max-w-[min(90vw,700px)] mb-2">
            {userColor === 'white' ? (
              <PlayerInfo
                name={gameData.blackPlayer?.username || 'Opponent'}
                rating={gameData.blackPlayer?.rating || 1200}
                timeRemaining={formatTime(blackTime)}
                capturedPieces={blackCaptured}
                materialAdvantage={calculateMaterialAdvantage('b')}
                isActive={isBlackTurn}
                isCurrentUser={false}
              />
            ) : (
              <PlayerInfo
                name={gameData.whitePlayer?.username || 'Opponent'}
                rating={gameData.whitePlayer?.rating || 1200}
                timeRemaining={formatTime(whiteTime)}
                capturedPieces={whiteCaptured}
                materialAdvantage={calculateMaterialAdvantage('w')}
                isActive={isWhiteTurn}
                isCurrentUser={false}
              />
            )}
          </div>

          {/* Chessboard */}
          <div
            className="w-full max-w-[820px] mb-2 shadow-2xl shadow-blue-500/5"
            style={{
              aspectRatio: '1 / 1',
              width: 'min(clamp(340px, 78vw, 820px), calc(100vh - 300px))',
              height: 'min(clamp(340px, 78vw, 820px), calc(100vh - 300px))',
              minHeight: '330px',
            }}
          >
            {(() => {
              console.log('[GamePage] Rendering ChessBoard with FEN:', gameData?.fenPosition);
              return null;
            })()}
            <ChessBoard
              fenPosition={gameData?.fenPosition || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
              onMove={handleMove}
              disabled={!canMakeMove || !userColor || waitingForOpponent}
              flipped={userColor === 'black'}
              userColor={userColor}
              currentTurn={gameData?.currentTurn}
              onSquareSelect={handleSquareSelect}
              legalMoves={legalMoves}
              lastMove={lastMove}
            />
          </div>

          {/* Bottom Player (You) */}
          <div className="w-full max-w-[min(90vw,700px)] mb-1">
            {userColor === 'white' ? (
              <PlayerInfo
                name={gameData.whitePlayer?.username || currentUser?.username || 'You'}
                rating={gameData.whitePlayer?.rating || 1200}
                timeRemaining={formatTime(whiteTime)}
                capturedPieces={whiteCaptured}
                materialAdvantage={calculateMaterialAdvantage('w')}
                isActive={isWhiteTurn}
                isCurrentUser={true}
              />
            ) : (
              <PlayerInfo
                name={gameData.blackPlayer?.username || currentUser?.username || 'You'}
                rating={gameData.blackPlayer?.rating || 1200}
                timeRemaining={formatTime(blackTime)}
                capturedPieces={blackCaptured}
                materialAdvantage={calculateMaterialAdvantage('b')}
                isActive={isBlackTurn}
                isCurrentUser={true}
              />
            )}
          </div>

          {/* Game Status + Controls */}
          <div className="w-full max-w-[min(90vw,700px)] flex gap-3">
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
        <div className="hidden xl:block w-[280px] max-h-[calc(100vh-80px)] bg-[#141B2D] border-l border-slate-800/50 flex-shrink-0 p-2 mt-2">
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
