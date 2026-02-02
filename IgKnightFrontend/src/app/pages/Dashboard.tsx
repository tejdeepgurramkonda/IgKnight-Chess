/**
 * Dashboard Page - Integrated with Backend
 * Show user stats, active games, and quick play options
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Trophy, Clock, Play, RefreshCw, AlertCircle, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { gameService } from '@/services/gameService';
import { authService } from '@/services/authService';
import type { GameResponse } from '@/types/game';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [activeGames, setActiveGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActiveGames();
  }, []);

  const loadActiveGames = async () => {
    try {
      setLoading(true);
      const games = await gameService.getActiveGames();
      setActiveGames(games);
    } catch (err: any) {
      setError(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const getOpponentName = (game: GameResponse): string => {
    if (!currentUser) return 'Unknown';
    // CRITICAL: Backend uses whitePlayerId/blackPlayerId NOT whitePlayer/blackPlayer objects
    if (game.whitePlayerId === currentUser.id) {
      return game.blackPlayerUsername || 'Waiting...';
    }
    if (game.blackPlayerId === currentUser.id) {
      return game.whitePlayerUsername || 'Waiting...';
    }
    return 'Spectating';
  };

  const getUserColor = (game: GameResponse): string => {
    if (!currentUser) return '';
    if (game.whitePlayerId === currentUser.id) return 'White';
    if (game.blackPlayerId === currentUser.id) return 'Black';
    return '';
  };

  const handleResignGame = async (gameId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to resign this game?')) {
      return;
    }

    try {
      await gameService.resignGame(gameId);
      // Reload active games
      await loadActiveGames();
    } catch (err: any) {
      setError(err.message || 'Failed to resign game');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {currentUser?.username}!
        </h1>
        <p className="text-slate-400">Ready for your next challenge?</p>
      </header>

      {error && (
        <Alert className="bg-red-900/20 border-red-600">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Play Section */}
      <section aria-labelledby="quick-play-heading">
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h2 id="quick-play-heading" className="text-xl font-bold text-white mb-4">Quick Play</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-lg p-6 transition-all group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-blue-600 group-hover:bg-blue-500 transition-colors">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-bold text-white text-lg mb-1">Find Game</p>
                <p className="text-slate-400 text-sm">Matchmaking</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/lobby')}
            className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-lg p-6 transition-all group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-green-600 group-hover:bg-green-500 transition-colors">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-bold text-white text-lg mb-1">Custom Game</p>
                <p className="text-slate-400 text-sm">Create & Share</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/leaderboard')}
            className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-lg p-6 transition-all group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-600 group-hover:bg-yellow-500 transition-colors">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-bold text-white text-lg mb-1">Leaderboard</p>
                <p className="text-slate-400 text-sm">Top Players</p>
              </div>
            </div>
          </button>
        </div>
        </Card>
      </section>

      {/* Active Games */}
      <section aria-labelledby="active-games-heading">
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 id="active-games-heading" className="text-xl font-bold text-white">Active Games</h2>
          <Button
            onClick={loadActiveGames}
            size="sm"
            variant="outline"
            className="border-slate-600"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading && activeGames.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mr-3" />
            <span className="text-slate-400">Loading games...</span>
          </div>
        ) : activeGames.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No active games</p>
            <Button
              onClick={() => navigate('/lobby')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Find a Game
            </Button>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {activeGames.map((game) => (
              <li key={game.id}>
                <button
                  onClick={() => navigate(`/play/${game.id}`)}
                  className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors text-left"
                  aria-label={`Resume game against ${getOpponentName(game)}, playing as ${getUserColor(game)}`}
                >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-white">vs {getOpponentName(game)}</p>
                    <span className="text-xs px-2 py-0.5 bg-blue-900 text-blue-300 rounded">
                      {getUserColor(game)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {game.timeControl ? `${Math.floor(game.timeControl / 60)}+${game.timeIncrement || 0}` : 'Unlimited'}
                    </span>
                    <span>•</span>
                    <span>{game.moves?.length || 0} moves</span>
                    {game.status === 'IN_PROGRESS' && game.currentTurn && (
                      <>
                        <span>•</span>
                        <span className="text-green-400">
                          {game.currentTurn === 'WHITE' ? "White's turn" : "Black's turn"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                    onClick={(e) => handleResignGame(game.id, e)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Resign
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/play/${game.id}`);
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        </Card>
      </section>

      {/* Getting Started */}
      <section aria-labelledby="getting-started-heading">
        <Card className="bg-gradient-to-br from-blue-900/20 to-slate-800 border-2 border-blue-600 p-6">
          <h2 id="getting-started-heading" className="text-xl font-bold text-white mb-3">Getting Started</h2>
          <ul className="space-y-2 text-sm text-slate-300 list-none">
            <li>• Click <strong className="text-white">Find Game</strong> to join matchmaking</li>
            <li>• Create a <strong className="text-white">Custom Game</strong> to play with friends</li>
            <li>• All games are saved automatically and sync in real-time</li>
            <li>• View your game history and track your progress</li>
          </ul>
        </Card>
      </section>
    </div>
  );
};
