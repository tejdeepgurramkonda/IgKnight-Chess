import React from 'react';
import { User, Clock } from 'lucide-react';

interface PlayerInfoProps {
  name: string;
  rating?: number;
  timeRemaining?: string;
  capturedPieces?: Array<{ type: string; color: string }>;
  isActive: boolean;
  materialAdvantage?: number;
  isCurrentUser?: boolean;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({
  name,
  rating,
  timeRemaining,
  capturedPieces = [],
  isActive,
  materialAdvantage = 0,
  isCurrentUser = false,
}) => {
  const pieceSymbols: Record<string, string> = {
    p: '♟',
    n: '♞',
    b: '♝',
    r: '♜',
    q: '♛',
  };

  return (
    <div
      className={`
        bg-[#141B2D] border rounded-lg p-2.5 transition-all duration-200
        ${isActive 
          ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' 
          : 'border-slate-800/50'
        }
      `}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Player Info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Avatar */}
          <div className={`
            w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
            ${isActive ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-slate-800/50'}
          `}>
            <User className={`w-4.5 h-4.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
          </div>

          {/* Name + Rating + Captured */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-sm truncate">{name}</h3>
              {rating && rating > 0 && (
                <span className="text-slate-500 text-xs font-medium">({rating})</span>
              )}
            </div>
            
            {/* Captured Pieces */}
            {capturedPieces.length > 0 && (
              <div className="flex items-center gap-0.5 mt-1">
                {capturedPieces.slice(0, 12).map((piece, index) => (
                  <span key={index} className="text-slate-500 text-xs opacity-80">
                    {pieceSymbols[piece.type]}
                  </span>
                ))}
                {materialAdvantage > 0 && (
                  <span className="text-blue-400 text-xs font-bold ml-1.5">+{materialAdvantage}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clock */}
        {timeRemaining && (
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md flex-shrink-0
            ${isActive 
              ? 'bg-blue-500/10 border border-blue-500/30' 
              : 'bg-slate-800/50 border border-slate-700/50'
            }
          `}>
            <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
            <span className={`font-mono font-bold text-sm tracking-tight ${
              isActive ? 'text-white' : 'text-slate-400'
            }`}>
              {timeRemaining}
            </span>
          </div>
        )}
      </div>

      {/* Active Turn Indicator */}
      {isActive && isCurrentUser && (
        <div className="mt-2 pt-2 border-t border-green-500/20 bg-green-500/5 -mx-2.5 -mb-2.5 px-2.5 pb-2.5 rounded-b-lg">
          <p className="text-green-400 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            YOUR TURN TO MOVE
          </p>
        </div>
      )}
      {isActive && !isCurrentUser && (
        <div className="mt-2 pt-2 border-t border-yellow-500/20 bg-yellow-500/5 -mx-2.5 -mb-2.5 px-2.5 pb-2.5 rounded-b-lg">
          <p className="text-yellow-400 text-xs font-semibold">Opponent's turn...</p>
        </div>
      )}
    </div>
  );
};
