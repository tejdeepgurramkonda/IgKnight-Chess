import { useState } from 'react';
import { Bell, Lock, Eye, Globe, Palette, Volume2, Shield, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

export const SettingsPage = () => {
  const [notifications, setNotifications] = useState(true);
  const [gameInvites, setGameInvites] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoQueen, setAutoQueen] = useState(true);
  const [showLegalMoves, setShowLegalMoves] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Customize your chess experience</p>
      </div>

      {/* Warning Notice */}
      <Alert className="bg-yellow-900/20 border-yellow-600">
        <AlertCircle className="h-5 w-5 text-yellow-400" />
        <AlertDescription className="text-yellow-400">
          <p className="font-semibold">Local Settings Only</p>
          <p className="text-sm mt-1">
            Settings are stored locally in your browser and will reset on page refresh.
            Backend persistence for user preferences is not yet implemented.
          </p>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="bg-slate-800 border-2 border-slate-700 w-full justify-start">
          <TabsTrigger
            value="account"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Account
          </TabsTrigger>
          <TabsTrigger
            value="game"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Game
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="privacy"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Account Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-slate-300">Username</Label>
                <Input
                  id="username"
                  defaultValue="GrandMaster99"
                  className="mt-2 bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="grandmaster99@chess.com"
                  className="mt-2 bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="country" className="text-slate-300">Country</Label>
                <Select defaultValue="usa">
                  <SelectTrigger className="mt-2 bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="usa" className="text-white hover:bg-slate-800">United States</SelectItem>
                    <SelectItem value="uk" className="text-white hover:bg-slate-800">United Kingdom</SelectItem>
                    <SelectItem value="canada" className="text-white hover:bg-slate-800">Canada</SelectItem>
                    <SelectItem value="germany" className="text-white hover:bg-slate-800">Germany</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Changes
              </Button>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Password & Security</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="current-password" className="text-slate-300">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  className="mt-2 bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  className="mt-2 bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-slate-300">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  className="mt-2 bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Update Password
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Game Settings */}
        <TabsContent value="game" className="mt-6 space-y-6">
          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Board Preferences</h2>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="board-theme" className="text-slate-300">Board Theme</Label>
                <Select defaultValue="classic">
                  <SelectTrigger className="mt-2 bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="classic" className="text-white hover:bg-slate-800">Classic Blue</SelectItem>
                    <SelectItem value="wood" className="text-white hover:bg-slate-800">Wooden</SelectItem>
                    <SelectItem value="marble" className="text-white hover:bg-slate-800">Marble</SelectItem>
                    <SelectItem value="neon" className="text-white hover:bg-slate-800">Neon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="piece-set" className="text-slate-300">Piece Set</Label>
                <Select defaultValue="standard">
                  <SelectTrigger className="mt-2 bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="standard" className="text-white hover:bg-slate-800">Standard</SelectItem>
                    <SelectItem value="classic" className="text-white hover:bg-slate-800">Classic</SelectItem>
                    <SelectItem value="modern" className="text-white hover:bg-slate-800">Modern</SelectItem>
                    <SelectItem value="minimal" className="text-white hover:bg-slate-800">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="show-legal-moves" className="text-white">Show Legal Moves</Label>
                  <p className="text-sm text-slate-400">Highlight possible moves when selecting a piece</p>
                </div>
                <Switch
                  id="show-legal-moves"
                  checked={showLegalMoves}
                  onCheckedChange={setShowLegalMoves}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-queen" className="text-white">Auto-Queen Promotion</Label>
                  <p className="text-sm text-slate-400">Automatically promote pawns to queens</p>
                </div>
                <Switch
                  id="auto-queen"
                  checked={autoQueen}
                  onCheckedChange={setAutoQueen}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Sound Settings</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sound-effects" className="text-white">Sound Effects</Label>
                  <p className="text-sm text-slate-400">Play sounds for moves and captures</p>
                </div>
                <Switch
                  id="sound-effects"
                  checked={soundEffects}
                  onCheckedChange={setSoundEffects}
                />
              </div>

              <div>
                <Label htmlFor="volume" className="text-slate-300">Volume</Label>
                <input
                  id="volume"
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="75"
                  className="mt-2 w-full accent-blue-600"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="mt-6">
          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notifications" className="text-white">Enable Notifications</Label>
                  <p className="text-sm text-slate-400">Receive all notifications</p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="game-invites" className="text-white">Game Invites</Label>
                  <p className="text-sm text-slate-400">Get notified when someone challenges you</p>
                </div>
                <Switch
                  id="game-invites"
                  checked={gameInvites}
                  onCheckedChange={setGameInvites}
                  disabled={!notifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="tournament-updates" className="text-white">Tournament Updates</Label>
                  <p className="text-sm text-slate-400">Notifications about tournament events</p>
                </div>
                <Switch
                  id="tournament-updates"
                  defaultChecked
                  disabled={!notifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="friend-requests" className="text-white">Friend Requests</Label>
                  <p className="text-sm text-slate-400">Get notified of new friend requests</p>
                </div>
                <Switch
                  id="friend-requests"
                  defaultChecked
                  disabled={!notifications}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="mt-6">
          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Privacy Settings</h2>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="profile-visibility" className="text-slate-300">Profile Visibility</Label>
                <Select defaultValue="public">
                  <SelectTrigger className="mt-2 bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="public" className="text-white hover:bg-slate-800">Public</SelectItem>
                    <SelectItem value="friends" className="text-white hover:bg-slate-800">Friends Only</SelectItem>
                    <SelectItem value="private" className="text-white hover:bg-slate-800">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="show-online-status" className="text-white">Show Online Status</Label>
                  <p className="text-sm text-slate-400">Let others see when you're online</p>
                </div>
                <Switch id="show-online-status" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="allow-spectators" className="text-white">Allow Spectators</Label>
                  <p className="text-sm text-slate-400">Let others watch your games</p>
                </div>
                <Switch id="allow-spectators" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="show-stats" className="text-white">Show Statistics</Label>
                  <p className="text-sm text-slate-400">Display your game stats on profile</p>
                </div>
                <Switch id="show-stats" defaultChecked />
              </div>
            </div>
          </Card>

          <Card className="bg-red-900/20 border-2 border-red-600 p-6">
            <h3 className="font-bold text-white mb-2">Danger Zone</h3>
            <p className="text-slate-300 text-sm mb-4">
              Permanently delete your account and all associated data
            </p>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
              Delete Account
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};