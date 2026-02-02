/**
 * Login Page
 * User authentication via username/password or Google OAuth
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.signIn({ usernameOrEmail, password });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    authService.initiateGoogleLogin();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">IgKnight Chess</h1>
          <p className="text-slate-400">Sign in to play</p>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-900/20 border-red-600">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username-email" className="text-slate-300 text-sm mb-2 block">Username or Email</label>
            <Input
              id="username-email"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Enter username or email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-slate-300 text-sm mb-2 block">Password</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-slate-400">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white hover:bg-gray-100 text-gray-900"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </Button>

        <p className="text-center text-slate-400 text-sm mt-6">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-blue-400 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
};
