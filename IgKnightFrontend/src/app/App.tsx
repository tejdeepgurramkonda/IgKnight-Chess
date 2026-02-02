/**
 * IGKNIGHT CHESS - Integrated Application
 * 
 * Frontend integrated with backend microservices.
 * Features: JWT auth, real chess games, matchmaking, WebSocket real-time updates
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { Layout } from '@/app/components/Layout';
import { LoginPage } from '@/app/pages/LoginPage';
import { SignUpPage } from '@/app/pages/SignUpPage';
import { OAuth2CallbackPage } from '@/app/pages/OAuth2CallbackPage';
import { Dashboard } from '@/app/pages/Dashboard';
import { GamePage } from '@/app/pages/GamePage';
import { LobbyPage } from '@/app/pages/LobbyPage';
import { ProfilePage } from '@/app/pages/ProfilePage';
import { HistoryPage } from '@/app/pages/HistoryPage';
import { LeaderboardPage } from '@/app/pages/LeaderboardPage';
import { SettingsPage } from '@/app/pages/SettingsPage';
import { NotFoundPage } from '@/app/pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary level="root">
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />        <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={
              <ErrorBoundary level="page">
                <Dashboard />
              </ErrorBoundary>
            } />
            <Route path="lobby" element={
              <ErrorBoundary level="page">
                <LobbyPage />
              </ErrorBoundary>
            } />
            <Route path="play/:gameId?" element={
              <ErrorBoundary level="page">
                <GamePage />
              </ErrorBoundary>
            } />
            <Route path="profile" element={
              <ErrorBoundary level="page">
                <ProfilePage />
              </ErrorBoundary>
            } />
            <Route path="history" element={
              <ErrorBoundary level="page">
                <HistoryPage />
              </ErrorBoundary>
            } />
            <Route path="leaderboard" element={
              <ErrorBoundary level="page">
                <LeaderboardPage />
              </ErrorBoundary>
            } />
            <Route path="settings" element={
              <ErrorBoundary level="page">
                <SettingsPage />
              </ErrorBoundary>
            } />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;