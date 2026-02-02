/**
 * Lobby Page - Integrated with Real Matchmaking
 * Find games, join matchmaking queue, or create custom games
 */

import { useState, useEffect, useRef } from 'react';
import { Clock, Users, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { matchmakingService } from '@/services/matchmakingService';
import { gameService } from '@/services/gameService';
import { authService } from '@/services/authService';
import { profileService } from '@/services/profileService';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { parseTimeControl } from '@/utils/timeControl';

const TIME_CONTROLS = [
  { name: 'Bullet', time: '1+0', icon: '⚡' },
  { name: 'Bullet', time: '2+1', icon: '⚡' },
  { name: 'Blitz', time: '3+0', icon: '🔥' },
  { name: 'Blitz', time: '3+2', icon: '🔥' },
  { name: 'Blitz', time: '5+0', icon: '🔥' },
  { name: 'Rapid', time: '10+0', icon: '⏱️' },
  { name: 'Rapid', time: '15+10', icon: '⏱️' },
  { name: 'Classical', time: '30+0', icon: '♔' },
];

export const LobbyPage = () => {
  const navigate = useNavigate();
  const [selectedTimeControl, setSelectedTimeControl] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [creatingGame, setCreatingGame] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);

  // Poll for match status while searching
  useEffect(() => {
    if (searching) {
      // Poll every 2 seconds
      pollingIntervalRef.current = window.setInterval(async () => {
        try {
          const statusResponse = await matchmakingService.checkStatus();
          console.log('Poll status response:', statusResponse);
          
          if (statusResponse.status === 'MATCHED' && statusResponse.match) {
            // Match found!
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            navigate(`/play/${statusResponse.match.gameId}`);
          }
        } catch (err: any) {
          // Silently ignore 404 errors during initial polling (race condition)
          if (err.status !== 404) {
            console.error('Error polling match status:', err);
          }
        }
      }, 2000);

      // Stop polling after 30 seconds
      setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          setError('No opponent found. Please try again.');
          handleCancelSearch();
        }
      }, 30000);
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [searching]);

  const handleQuickPlay = async (timeControl: string) => {
    // GUARD: Prevent duplicate matchmaking joins
    if (searching) {
      console.log('Already searching - ignoring duplicate request');
      return;
    }

    setSelectedTimeControl(timeControl);
    setSearching(true);
    setError('');

    const user = authService.getCurrentUser();
    if (!user) {
      setError('Not authenticated');
      setSearching(false);
      return;
    }

    try {
      // Fetch user's profile to get their actual rating
      // Backend automatically creates profile with default rating (1200) if it doesn't exist
      const profileResponse = await profileService.getMyProfile();
      const userRating = profileResponse?.rating ?? 1200; // Fallback to 1200 if profile fetch fails
      
      console.log('Joining queue with:', { username: user.username, rating: userRating, timeControl });
      
      const response = await matchmakingService.joinQueue({
        username: user.username,
        rating: userRating,
        timeControl,
      });

      console.log('Matchmaking join response:', response);

      if (response.status === 'MATCHED' && response.match) {
        // Match found immediately
        navigate(`/play/${response.match.gameId}`);
      } else if (response.status === 'QUEUED') {
        // Queued - polling will check for matches
        console.log('Queued, waiting for match...');
      } else if (response.status === 'ERROR') {
        // Backend returned error status
        setError(response.message || 'Matchmaking failed');
        setSearching(false);
        setSelectedTimeControl('');
      }
    } catch (err: any) {
      // Handle HTTP errors (409 = already in queue, 401 = unauthorized, etc.)
      if (err.status === 409) {
        setError('You are already in the matchmaking queue');
      } else if (err.status === 401) {
        setError('Authentication failed - please log in again');
      } else {
        setError(err.message || 'Failed to join matchmaking');
      }
      setSearching(false);
      setSelectedTimeControl('');
    }
  };

  const handleCancelSearch = async () => {
    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      await matchmakingService.leaveQueue();
    } catch (err: any) {
      // Ignore 404 - user already left queue after matching
      if (err.status !== 404) {
        console.error('Failed to leave queue:', err);
      }
    }
    setSearching(false);
    setSelectedTimeControl('');
  };

  const handleCreateGame = async () => {
    setCreatingGame(true);
    setError('');

    try {
      const { timeControl, timeIncrement } = parseTimeControl('10+0');
      const game = await gameService.createGame({ 
        timeControl, 
        timeIncrement,
        isRated: false 
      });
      navigate(`/play/${game.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create game');
      setCreatingGame(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Find a Game</h1>
        <p className="text-slate-400">Choose your time control and start playing</p>
      </div>

      {error && (
        <Alert className="bg-red-900/20 border-red-600">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Play */}
          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Quick Play</h2>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Users className="w-4 h-4" />
                <span>Find an opponent</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TIME_CONTROLS.map((tc, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPlay(tc.time)}
                  disabled={searching}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedTimeControl === tc.time
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-slate-900 border-slate-700 hover:border-blue-600'
                  } ${searching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tc.icon}</span>
                      <div>
                        <p className="font-bold text-white">{tc.name}</p>
                        <p className="text-blue-400 font-semibold">{tc.time}</p>
                      </div>
                    </div>
                    {selectedTimeControl === tc.time && searching && (
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Matchmaking
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {searching && selectedTimeControl && (
              <div className="mt-6 p-4 bg-blue-900/20 border-2 border-blue-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold mb-1">Finding opponent...</p>
                    <p className="text-slate-300 text-sm">Time control: {selectedTimeControl}</p>
                  </div>
                  <Button
                    onClick={handleCancelSearch}
                    variant="outline"
                    className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Create Custom Game */}
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create Custom Game</h2>
            <p className="text-slate-400 text-sm mb-4">
              Start a game and share the link with your opponent
            </p>
            <Button
              onClick={handleCreateGame}
              disabled={creatingGame || searching}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {creatingGame ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating Game...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Create Game
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Instructions */}
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">How to Play</h2>
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                <strong className="text-white">Quick Play:</strong> Click a time control to find an opponent through matchmaking
              </p>
              <p>
                <strong className="text-white">Custom Game:</strong> Create a game and share the link with a friend
              </p>
              <p className="text-slate-400 text-xs mt-4">
                Games are saved automatically. Real-time updates via WebSocket.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
