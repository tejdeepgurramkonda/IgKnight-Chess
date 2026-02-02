/**
 * Authentication Types
 */

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
  country: string;  // REQUIRED by backend
}

export interface SignInRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  username: string;
  email: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  rating?: number;
}
