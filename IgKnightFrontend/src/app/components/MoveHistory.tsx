import React from 'react';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { History } from 'lucide-react';

interface Move {
  white?: string;
  black?: string;
  moveNumber: number;
}

interface MoveHistoryProps {
  moves: Move[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  return (
    <div className="h-full max-h-[calc(100vh-80px)] flex flex-col bg-[#141B2D]">
      {/* Header - Chess Scoresheet Style */}
      <div className="p-3 border-b border-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-white font-semibold text-xs tracking-wide">MOVES</h3>
        </div>
        {moves.length > 0 && (
          <p className="text-slate-500 text-[10px] mt-1 font-mono">{moves.length} half-moves</p>
        )}
      </div>

      {/* Moves List - Professional Scoresheet */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {moves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-lg bg-slate-800/30 flex items-center justify-center mb-2">
                <span className="text-2xl">♟</span>
              </div>
              <p className="text-slate-500 text-xs font-medium">No moves yet</p>
            </div>
          ) : (
            <ol className="space-y-px" role="list">
              {moves.map((move, index) => (
                <li
                  key={index}
                  className={`
                    grid grid-cols-[35px_1fr_1fr] gap-1 px-2 py-1.5 font-mono text-xs
                    transition-colors duration-150
                    ${index % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'}
                    ${index === moves.length - 1 
                      ? 'bg-blue-500/10 text-white font-bold' 
                      : 'text-slate-300 hover:bg-slate-800/40'
                    }
                  `}
                >
                  <span className="text-slate-500 text-[11px] font-semibold">
                    {move.moveNumber}.
                  </span>
                  <span className="text-[11px]">
                    {move.white || '—'}
                  </span>
                  <span className="text-[11px]">
                    {move.black || '—'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </ScrollArea>

      {/* Footer - Opening Info */}
      <div className="p-2 border-t border-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500 font-medium">Opening</span>
          <span className="text-slate-400 font-semibold">Italian Game</span>
        </div>
      </div>
    </div>
  );
};
