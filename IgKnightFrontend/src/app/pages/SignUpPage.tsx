/**
 * Sign Up Page
 * New user registration
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

export const SignUpPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!country.trim()) {
      setError('Country is required');
      return;
    }

    setLoading(true);

    try {
      await authService.signUp({ username, email, password, country });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-slate-400">Join IgKnight Chess</p>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-900/20 border-red-600">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-4">
            <legend className="sr-only">Account Information</legend>
            
            <div>
              <label htmlFor="username" className="text-slate-300 text-sm mb-2 block">Username</label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="text-slate-300 text-sm mb-2 block">Email</label>
              <Input
                id="email"
                type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
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

            <div>
              <label htmlFor="confirm-password" className="text-slate-300 text-sm mb-2 block">Confirm Password</label>
              <Input
                id="confirm-password"
                type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              required
              disabled={loading}
            />
          </div>

            <div>
              <label htmlFor="country" className="text-slate-300 text-sm mb-2 block">Country</label>
              <Input
                id="country"
                type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="e.g., USA, UK, France"
              required
              disabled={loading}
            />
            </div>
          </fieldset>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
};
