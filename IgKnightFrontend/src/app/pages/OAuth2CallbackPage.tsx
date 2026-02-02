/**
 * OAuth2 Callback Page
 * 
 * Handles the redirect from backend after successful Google OAuth login.
 * Extracts JWT token from URL and stores it, then navigates to dashboard.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tokenStorage } from '@/services/tokenStorage';
import { Card } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export const OAuth2CallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check for error in URL (OAuth failure)
      const error = searchParams.get('error');
      const errorMsg = searchParams.get('message');

      if (error) {
        setStatus('error');
        setErrorMessage(errorMsg || 'OAuth authentication failed');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Extract OAuth success data
      const token = searchParams.get('token');
      const userId = searchParams.get('userId');
      const username = searchParams.get('username');
      const email = searchParams.get('email');

      if (!token || !userId || !username || !email) {
        setStatus('error');
        setErrorMessage('Invalid OAuth response - missing required data');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Store token and user data
        tokenStorage.setToken(token);
        tokenStorage.setUser({
          id: parseInt(userId),
          username,
          email,
        });

        setStatus('success');
        
        // Redirect to dashboard after brief success message
        setTimeout(() => navigate('/'), 1500);
      } catch (err) {
        setStatus('error');
        setErrorMessage('Failed to store authentication data');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 p-8">
        {status === 'processing' && (
          <div className="text-center">
            <RefreshCw className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">Processing Google Login</h2>
            <p className="text-slate-400">Please wait...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Login Successful!</h2>
            <p className="text-slate-400">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Login Failed</h2>
            <Alert className="mt-4 bg-red-900/20 border-red-600">
              <AlertDescription className="text-red-400">
                {errorMessage}
              </AlertDescription>
            </Alert>
            <p className="text-slate-400 text-sm mt-4">Redirecting to login page...</p>
          </div>
        )}
      </Card>
    </div>
  );
};
