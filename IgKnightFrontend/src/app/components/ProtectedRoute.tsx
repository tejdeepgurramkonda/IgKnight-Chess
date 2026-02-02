/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import { Navigate } from 'react-router-dom';
import { authService } from '@/services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
