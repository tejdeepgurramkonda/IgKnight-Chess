import React, { useState, useEffect, useRef } from 'react';
import { Square, Piece, BoardPosition, parseFenForDisplay, PieceType, PieceColor } from '@/types/chess';

interface ChessBoardProps {
  fenPosition: string;
  onMove: (from: Square, to: Square) => void;
  disabled?: boolean;
  flipped?: boolean;
  userColor?: 'white' | 'black' | null;
  currentTurn?: 'WHITE' | 'BLACK';
  onSquareSelect?: (square: Square) => void;
  legalMoves?: Square[];
  lastMove?: { from: Square; to: Square } | null;
}

interface PieceProps {
  piece: Piece | null;
  square: Square;
  isSelected: boolean;
  isPossibleMove: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  isMoving: boolean;
  onClick: () => void;
}

interface AnimatingPiece {
  piece: Piece;
  from: Square;
  to: Square;
  timestamp: number;
}

const ChessPiece: React.FC<PieceProps> = ({ 
  piece, 
  isSelected, 
  isPossibleMove, 
  isCapture,
  isMoving,
  onClick 
}) => {
  if (!piece) {
    return (
      <div
        onClick={onClick}
        className={`w-full h-full flex items-center justify-center cursor-pointer relative
          ${isPossibleMove ? 'after:absolute after:w-[25%] after:h-[25%] after:bg-blue-400/70 after:rounded-full hover:after:scale-110 after:transition-all after:duration-150' : ''}
        `}
      />
    );
  }

  const pieceSymbols: Record<PieceColor, Record<PieceType, string>> = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' },
  };

  return (
    <div
      onClick={onClick}
      className={`
        w-full h-full flex items-center justify-center cursor-pointer select-none
        transition-all duration-150 ease-out relative
      text-[clamp(26px,5.2vw,48px)]
        ${isSelected ? 'scale-110 z-30 brightness-125' : 'z-10'}
        ${isPossibleMove || isCapture ? 'hover:scale-105' : ''}
        ${isMoving ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        ${piece.color === 'w' 
          ? 'text-slate-50 drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]' 
          : 'text-gray-800 drop-shadow-[0_2px_4px_rgba(255,255,255,0.5)]'
        }
      `}
    >
      {pieceSymbols[piece.color][piece.type]}
      {/* Capture indicator - ring around the piece */}
      {isCapture && (
        <div className="absolute inset-0 rounded-full border-4 border-red-400/80 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};

export const ChessBoard: React.FC<ChessBoardProps> = ({ 
  fenPosition, 
  onMove, 
  disabled = false, 
  flipped = false, 
  userColor = null,
  currentTurn,
  onSquareSelect,
  legalMoves = [],
  lastMove = null
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [boardPosition, setBoardPosition] = useState<BoardPosition>({});
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);
  const [previousFen, setPreviousFen] = useState<string>('');
  const [previousPosition, setPreviousPosition] = useState<BoardPosition>({});
  const [squareSize, setSquareSize] = useState<number>(80);
  const boardRef = useRef<HTMLDivElement>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

  const displayFiles = flipped ? [...files].reverse() : files;
  const displayRanks = flipped ? [...ranks].reverse() : ranks;

  // Parse FEN whenever it changes (backend update)
  useEffect(() => {
    if (!fenPosition) return;
    
    console.log('[ChessBoard] FEN prop changed:', fenPosition);
    console.log('[ChessBoard] Previous FEN:', previousFen);
    const newPosition = parseFenForDisplay(fenPosition);
    console.log('[ChessBoard] Parsed board position:', newPosition);
    
    // Detect move animation (FEN changed means a move happened)
    if (previousFen && previousFen !== fenPosition && lastMove) {
      // Get the piece from the OLD position (before the move)
      const piece = previousPosition[lastMove.from];
      if (piece) {
        setAnimatingPiece({
          piece,
          from: lastMove.from,
          to: lastMove.to,
          timestamp: Date.now(),
        });
        
        setTimeout(() => {
          setAnimatingPiece(null);
        }, 250);
      }
    }
    
    // Update position and cache for next animation
    setPreviousPosition(boardPosition);
    setBoardPosition(newPosition);
    setPreviousFen(fenPosition);
  }, [fenPosition, previousFen, lastMove]);

  // Track square size to scale pieces and animations with the board
  useEffect(() => {
    if (!boardRef.current) return;

    const updateSize = () => {
      const width = boardRef.current?.clientWidth || 640;
      setSquareSize(width / 8);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(boardRef.current);

    return () => observer.disconnect();
  }, []);

  const handleSquareClick = (square: Square) => {
    if (disabled) return;
    
    if (selectedSquare) {
      // Try to make a move - check if it's a legal move (from backend)
      const isLegalMove = legalMoves.includes(square);

      if (isLegalMove) {
        // Animate the move
        const piece = boardPosition[selectedSquare];
        if (piece) {
          setAnimatingPiece({
            piece,
            from: selectedSquare,
            to: square,
            timestamp: Date.now(),
          });
        }
        
        // Execute move
        onMove(selectedSquare, square);
        setSelectedSquare(null);
        
        // Clear animation after completion
        setTimeout(() => {
          setAnimatingPiece(null);
        }, 250);
      } else {
        // Select new piece or deselect
        const piece = boardPosition[square];
        const canSelect = piece && canSelectPiece(piece, square);
        
        if (canSelect) {
          setSelectedSquare(square);
          // Notify parent to fetch legal moves from backend
          onSquareSelect?.(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      // Select piece - only allow selecting own pieces
      const piece = boardPosition[square];
      const canSelect = piece && canSelectPiece(piece, square);
      
      if (canSelect) {
        setSelectedSquare(square);
        // Notify parent to fetch legal moves from backend
        onSquareSelect?.(square);
      }
    }
  };

  const canSelectPiece = (piece: Piece, square: Square): boolean => {
    if (!piece || !currentTurn) return false;
    
    // Convert backend turn format (WHITE/BLACK) to piece color (w/b)
    const turnColor = currentTurn === 'WHITE' ? 'w' : 'b';
    
    // Piece must match the current turn
    if (piece.color !== turnColor) return false;
    
    // User can only select their own color pieces
    if (userColor === 'white' && piece.color !== 'w') return false;
    if (userColor === 'black' && piece.color !== 'b') return false;
    
    return true;
  };

  const getSquarePosition = (square: Square): { row: number; col: number } => {
    const file = square[0];
    const rank = square[1];
    const col = displayFiles.indexOf(file as any);
    const row = displayRanks.indexOf(rank as any);
    return { row, col };
  };

  const isLightSquare = (file: string, rank: string) => {
    const fileIndex = files.indexOf(file as typeof files[number]);
    const rankIndex = parseInt(rank);
    return (fileIndex + rankIndex) % 2 === 0;
  };

  // Render animating piece overlay
  const renderAnimatingPiece = () => {
    if (!animatingPiece || !boardRef.current) return null;

    const fromPos = getSquarePosition(animatingPiece.from);
    const toPos = getSquarePosition(animatingPiece.to);
    
    const pieceSymbols: Record<PieceColor, Record<PieceType, string>> = {
      w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
      b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
    };

    return (
      <div
        className="absolute top-0 left-0 pointer-events-none z-50 text-5xl select-none transition-all duration-250 ease-out"
        style={{
          transform: `translate(${toPos.col * squareSize}px, ${toPos.row * squareSize}px)`,
          width: `${squareSize}px`,
          height: `${squareSize}px`,
        }}
      >
        <div className={`w-full h-full flex items-center justify-center ${
          animatingPiece.piece.color === 'w'
            ? 'text-slate-50 drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]'
            : 'text-slate-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)]'
        }`}>
          {pieceSymbols[animatingPiece.piece.color][animatingPiece.piece.type]}
        </div>
      </div>
    );
  };

  if (!fenPosition) {
    return (
      <div className="w-full h-full grid grid-cols-8 gap-0 border-4 border-slate-700 shadow-2xl rounded-sm overflow-hidden">
        {displayRanks.map((rank) =>
          displayFiles.map((file) => {
            const square = `${file}${rank}` as Square;
            const isLight = isLightSquare(file, rank);
            return (
              <div
                key={square}
                className={`aspect-square ${
                  isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'
                }`}
              />
            );
          })
        )}
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full" ref={boardRef}>
      <div className="w-full h-full grid grid-cols-8 gap-0 border-4 border-slate-700 shadow-2xl rounded-sm overflow-hidden relative">
        {displayRanks.map((rank) =>
          displayFiles.map((file) => {
            const square = `${file}${rank}` as Square;
            const piece = boardPosition[square] || null;
            const isLight = isLightSquare(file, rank);
            const isSelected = selectedSquare === square;
            const isPossibleMove = legalMoves.includes(square);
            const isCapture = isPossibleMove && piece !== null;
            const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
            const isMoving = animatingPiece && 
              (animatingPiece.from === square || animatingPiece.to === square);

            return (
              <div
                key={square}
                className={`
                  aspect-square relative transition-colors duration-200
                  ${isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'}
                  ${isSelected ? 'ring-4 ring-blue-500/50 ring-inset z-20' : ''}
                  ${isLastMoveSquare && isLight ? 'bg-[#CDD26A]' : ''}
                  ${isLastMoveSquare && !isLight ? 'bg-[#AAC44A]' : ''}
                  ${isPossibleMove || isCapture ? 'cursor-pointer' : ''}
                `}
              >
                <ChessPiece
                  piece={piece}
                  square={square}
                  isSelected={isSelected}
                  isPossibleMove={isPossibleMove && !piece}
                  isCapture={isCapture}
                  isLastMove={isLastMoveSquare || false}
                  isMoving={isMoving || false}
                  onClick={() => handleSquareClick(square)}
                />
                {/* File and rank labels */}
                {rank === (flipped ? '8' : '1') && (
                  <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold select-none ${isLight ? 'text-[#B58863]' : 'text-[#F0D9B5]'}`}>
                    {file}
                  </span>
                )}
                {file === (flipped ? 'h' : 'a') && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-bold select-none ${isLight ? 'text-[#B58863]' : 'text-[#F0D9B5]'}`}>
                    {rank}
                  </span>
                )}
              </div>
            );
          })
        )}
        {renderAnimatingPiece()}
      </div>
    </div>
  );
};