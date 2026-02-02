import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import React, { useState, useEffect, useRef } from 'react';

interface ChessBoardProps {
  game: Chess | null;
  onMove: (from: Square, to: Square) => void;
  disabled?: boolean;
  flipped?: boolean;
  userColor?: 'white' | 'black' | null;
}

interface PieceProps {
  piece: { type: PieceSymbol; color: Color } | null;
  square: Square;
  isSelected: boolean;
  isPossibleMove: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  isMoving: boolean;
  onClick: () => void;
}

interface AnimatingPiece {
  piece: { type: PieceSymbol; color: Color };
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
          ${isPossibleMove ? 'after:absolute after:w-5 after:h-5 after:bg-blue-400/70 after:rounded-full hover:after:scale-110 after:transition-all after:duration-150' : ''}
        `}
      />
    );
  }

  const pieceSymbols: Record<Color, Record<PieceSymbol, string>> = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' },
  };

  return (
    <div
      onClick={onClick}
      className={`
        w-full h-full flex items-center justify-center cursor-pointer text-5xl select-none
        transition-all duration-150 ease-out relative
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

export const ChessBoard: React.FC<ChessBoardProps> = ({ game, onMove, disabled = false, flipped = false, userColor = null }) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);
  const [previousFen, setPreviousFen] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

  const displayFiles = flipped ? [...files].reverse() : files;
  const displayRanks = flipped ? [...ranks].reverse() : ranks;

  // Update last move when game changes
  useEffect(() => {
    if (!game) {
      setLastMove(null);
      return;
    }
    
    const currentFen = game.fen();
    const history = game.history({ verbose: true });
    
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (last) {
        const newLastMove = { from: last.from, to: last.to };
      
        // Detect if this is a new move (FEN changed)
        if (previousFen && previousFen !== currentFen && lastMove) {
          // New move detected - animate it
          const piece = game.get(last.to);
          if (piece) {
            setAnimatingPiece({
              piece,
              from: last.from,
              to: last.to,
              timestamp: Date.now(),
            });
            
            // Clear animation after 250ms
            setTimeout(() => {
              setAnimatingPiece(null);
            }, 250);
          }
        }
        
        setLastMove(newLastMove);
      }
    }
    
    setPreviousFen(currentFen);
  }, [game?.fen()]);

  const handleSquareClick = (square: Square) => {
    if (disabled || !game) return;
    
    if (selectedSquare) {
      // Try to make a move
      const moves = game.moves({ square: selectedSquare, verbose: true });
      const move = moves.find((m) => m.to === square);

      if (move) {
        // Animate the move
        const piece = game.get(selectedSquare);
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
        setPossibleMoves([]);
        
        // Clear animation after completion
        setTimeout(() => {
          setAnimatingPiece(null);
        }, 250);
      } else {
        // Select new piece or deselect
        const piece = game.get(square);
        // Only allow selecting pieces of user's color
        const canSelect = piece && 
                         piece.color === game.turn() && 
                         ((userColor === 'white' && piece.color === 'w') || 
                          (userColor === 'black' && piece.color === 'b'));
        
        if (canSelect) {
          setSelectedSquare(square);
          const newMoves = game.moves({ square, verbose: true });
          setPossibleMoves(newMoves.map((m) => m.to));
        } else {
          setSelectedSquare(null);
          setPossibleMoves([]);
        }
      }
    } else {
      // Select piece - only allow selecting own pieces
      const piece = game.get(square);
      const canSelect = piece && 
                       piece.color === game.turn() && 
                       ((userColor === 'white' && piece.color === 'w') || 
                        (userColor === 'black' && piece.color === 'b'));
      
      if (canSelect) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map((m) => m.to));
      }
    }
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
    
    const squareSize = 80; // md:w-20 = 80px
    
    const pieceSymbols: Record<Color, Record<PieceSymbol, string>> = {
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

  return (
    <div className="relative" ref={boardRef}>
      {!game ? (
        <div className="grid grid-cols-8 gap-0 border-4 border-slate-700 shadow-2xl rounded-sm overflow-hidden">
          {displayRanks.map((rank) =>
            displayFiles.map((file) => {
              const square = `${file}${rank}` as Square;
              const isLight = isLightSquare(file, rank);
              return (
                <div
                  key={square}
                  className={`w-16 h-16 md:w-20 md:h-20 ${
                    isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'
                  }`}
                />
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-8 gap-0 border-4 border-slate-700 shadow-2xl rounded-sm overflow-hidden relative">
          {displayRanks.map((rank) =>
            displayFiles.map((file) => {
              const square = `${file}${rank}` as Square;
              const piece = game.get(square);
              const isLight = isLightSquare(file, rank);
              const isSelected = selectedSquare === square;
              const isPossibleMove = possibleMoves.includes(square);
              const isCapture = isPossibleMove && piece !== null; // It's a capture if it's a valid move AND has a piece
              const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
              const isMoving = animatingPiece && 
                (animatingPiece.from === square || animatingPiece.to === square);

              return (
                <div
                  key={square}
                  className={`
                    w-16 h-16 md:w-20 md:h-20 relative transition-colors duration-200
                    ${isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'}
                    ${isSelected ? 'ring-4 ring-blue-500/50 ring-inset z-20' : ''}
                    ${isLastMoveSquare && isLight ? 'bg-[#CDD26A]' : ''}
                    ${isLastMoveSquare && !isLight ? 'bg-[#AAC44A]' : ''}
                    ${isPossibleMove || isCapture ? 'cursor-pointer' : ''}
                  `}
                >
                  <ChessPiece
                    piece={piece || null}
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
      )}
    </div>
  );
};