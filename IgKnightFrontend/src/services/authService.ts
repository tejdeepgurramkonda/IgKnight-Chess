/**
 * Authentication Service
 * Handles login, signup, logout, and Google OAuth
 */

import { httpClient } from './httpClient';
import { tokenStorage } from './tokenStorage';
import type { SignUpRequest, SignInRequest, AuthResponse } from '@/types/auth';

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>(
      '/api/auth/signup',
      data,
      { requiresAuth: false }
    );

    // Store token and user
    tokenStorage.setToken(response.token);
    tokenStorage.setUser({
      id: response.userId,
      username: response.username,
      email: response.email,
    });

    return response;
  },

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInRequest): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>(
      '/api/auth/signin',
      data,
      { requiresAuth: false }
    );

    // Store token and user
    tokenStorage.setToken(response.token);
    tokenStorage.setUser({
      id: response.userId,
      username: response.username,
      email: response.email,
    });

    return response;
  },

  /**
   * Sign out the current user
   */
  signOut(): void {
    tokenStorage.clear();
    window.location.href = '/login';
  },

  /**
   * Initiate Google OAuth login
   * Google OAuth goes through API Gateway
   */
  initiateGoogleLogin(): void {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083'}/api/auth/oauth2/authorization/google`;
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return tokenStorage.getUser();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return tokenStorage.isAuthenticated();
  },
};
