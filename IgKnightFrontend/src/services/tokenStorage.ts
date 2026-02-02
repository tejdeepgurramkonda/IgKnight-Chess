/**
 * Token Storage Service
 * Secure token management with localStorage
 */

const TOKEN_KEY = 'igknight_auth_token';
const USER_KEY = 'igknight_user';

export const tokenStorage = {
  /**
   * Store authentication token
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Retrieve authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Remove authentication token
   */
  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * Store user data
   */
  setUser(user: { id: number; username: string; email: string }): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Retrieve user data
   */
  getUser(): { id: number; username: string; email: string } | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  /**
   * Remove user data
   */
  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Clear all auth data
   */
  clear(): void {
    this.removeToken();
    this.removeUser();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
