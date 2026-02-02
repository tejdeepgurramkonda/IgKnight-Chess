import { useState, useEffect } from 'react';
import { User, Calendar, MapPin, Award, TrendingUp, Target, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { profileService, UserProfileResponse } from '@/services/profileService';
import { authService } from '@/services/authService';

export const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await profileService.getMyProfile();
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="ml-3 text-white">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Alert className="bg-red-900/20 border-red-600">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <div className="flex flex-col gap-2">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError('');
                  loadProfile();
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

  if (!profile) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <p className="text-white">No profile found</p>
      </div>
    );
  }

  const winRate = profile.gamesPlayed > 0 
    ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-slate-400">Your chess journey and statistics</p>
      </div>

      {/* Profile Card */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-4xl text-white font-bold mb-4">
              {profile.username.substring(0, 2).toUpperCase()}
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled>
              Change Avatar
            </Button>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {profile.displayName || profile.username}
              </h2>
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <User className="w-4 h-4" />
                <span>@{profile.username}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              {profile.country && (
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.country}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div>
                <p className="text-slate-400 text-sm">Rating</p>
                <p className="text-3xl font-bold text-blue-400">{profile.rating}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Games Played</p>
                <p className="text-3xl font-bold text-white">{profile.gamesPlayed}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Win Rate</p>
                <p className="text-3xl font-bold text-green-400">{winRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-start justify-between mb-2">
            <p className="text-slate-400 text-sm">Total Games</p>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{profile.gamesPlayed}</p>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-start justify-between mb-2">
            <p className="text-slate-400 text-sm">Wins</p>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-400 mb-1">{profile.gamesWon}</p>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-start justify-between mb-2">
            <p className="text-slate-400 text-sm">Losses</p>
            <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
          </div>
          <p className="text-3xl font-bold text-red-400 mb-1">{profile.gamesLost}</p>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-start justify-between mb-2">
            <p className="text-slate-400 text-sm">Draws</p>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-400 mb-1">{profile.gamesDrawn}</p>
        </Card>
      </div>

      {/* Future Features Notice */}
      <Alert className="bg-blue-900/20 border-blue-600">
        <AlertCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-400">
          <p className="text-sm">
            Additional features like achievements and opening statistics are not yet implemented.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};
