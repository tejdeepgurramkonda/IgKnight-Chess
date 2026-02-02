import React from 'react';
import { Flag, Handshake, Settings, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';

interface GameControlsProps {
  onResign: () => void;
  onOfferDraw: () => void;
  canResign?: boolean;
  canOfferDraw?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onResign,
  onOfferDraw,
  canResign = true,
  canOfferDraw = true,
}) => {
  return (
    <div className="bg-[#141B2D] border border-slate-800/50 rounded-lg p-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {/* Offer Draw */}
        <Button
          onClick={onOfferDraw}
          disabled={!canOfferDraw}
          className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-xs font-semibold transition-colors rounded-md border border-blue-500/30"
        >
          <Handshake className="w-3 h-3 mr-1" />
          Draw
        </Button>

        {/* Resign */}
        <Button
          onClick={onResign}
          disabled={!canResign}
          className="bg-red-600/10 hover:bg-red-600/20 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-xs font-semibold transition-colors rounded-md border border-red-500/30"
        >
          <Flag className="w-3 h-3 mr-1" />
          Resign
        </Button>

        {/* Settings */}
        <Button
          onClick={() => toast.info('Coming Soon', {
            description: 'In-game settings are under development',
          })}
          className="bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 py-2 text-xs font-semibold transition-colors rounded-md border border-slate-700/50"
        >
          <Settings className="w-3 h-3 mr-1" />
          Settings
        </Button>

        {/* Report */}
        <Button
          onClick={() => toast.info('Coming Soon', {
            description: 'Player reporting feature is under development',
          })}
          className="bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 py-2 text-xs font-semibold transition-colors rounded-md border border-slate-700/50"
        >
          <AlertTriangle className="w-3 h-3 mr-1" />
          Report
        </Button>
      </div>
    </div>
  );
};
