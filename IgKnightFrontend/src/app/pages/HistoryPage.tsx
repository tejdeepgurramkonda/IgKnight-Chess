import { Calendar, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

export const HistoryPage = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-400" />
          Game History
        </h1>
        <p className="text-slate-400">Review your past games and performance</p>
      </div>

      {/* Not Implemented Notice */}
      <Alert className="bg-yellow-900/20 border-yellow-600">
        <AlertCircle className="h-5 w-5 text-yellow-400" />
        <AlertDescription className="text-yellow-400">
          <div className="space-y-2">
            <p className="font-semibold text-lg">Feature Not Yet Implemented</p>
            <p>
              Game history tracking requires backend API endpoints that haven't been implemented yet.
              Once the game-service is enhanced with history storage, you'll be able to review all your past games.
            </p>
            <p className="text-sm text-yellow-300 mt-3">
              <strong>Coming Soon:</strong> Game replays, move analysis, opening statistics, and performance tracking.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Placeholder Card */}
      <Card className="bg-slate-800 border-slate-700 p-12">
        <div className="text-center text-slate-500 space-y-4">
          <Calendar className="w-16 h-16 mx-auto opacity-30" />
          <p className="text-lg">No game history available</p>
          <p className="text-sm">Backend API for game history storage and retrieval needs to be implemented.</p>
        </div>
      </Card>
    </div>
  );
};
