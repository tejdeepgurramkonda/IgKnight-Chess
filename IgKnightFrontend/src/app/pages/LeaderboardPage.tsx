import { Trophy, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

export const LeaderboardPage = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Leaderboard
        </h1>
        <p className="text-slate-400">Top players from around the world</p>
      </div>

      {/* Not Implemented Notice */}
      <Alert className="bg-yellow-900/20 border-yellow-600">
        <AlertCircle className="h-5 w-5 text-yellow-400" />
        <AlertDescription className="text-yellow-400">
          <div className="space-y-2">
            <p className="font-semibold text-lg">Feature Not Yet Implemented</p>
            <p>
              The leaderboard functionality requires backend support that hasn't been implemented yet.
              This feature will be available once the ranking and statistics microservice is deployed.
            </p>
            <p className="text-sm text-yellow-300 mt-3">
              <strong>Coming Soon:</strong> Global rankings, country rankings, rating distributions, and player statistics.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Placeholder Card */}
      <Card className="bg-slate-800 border-slate-700 p-12">
        <div className="text-center text-slate-500 space-y-4">
          <Trophy className="w-16 h-16 mx-auto opacity-30" />
          <p className="text-lg">No leaderboard data available</p>
          <p className="text-sm">Backend API endpoints for rankings and statistics need to be implemented.</p>
        </div>
      </Card>
    </div>
  );
};
