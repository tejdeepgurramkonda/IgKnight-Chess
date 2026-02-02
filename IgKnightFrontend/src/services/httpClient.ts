/**
 * HTTP Client with Authentication
 * Centralized API client with JWT token injection and comprehensive error handling
 * 
 * CONTRACT ENFORCEMENT:
 * - Gateway injects X-User-Id and X-Username headers after JWT validation
 * - Handle all backend error cases: 400, 401, 403, 409, 500
 * - Provide user-friendly error messages
 * - Smart retry for transient failures (network errors, 503, 504)
 * - Never retry non-idempotent operations that failed
 */

import { tokenStorage } from './tokenStorage';
import { ENV } from '@/config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  baseURL?: string;
  maxRetries?: number;  // Default: 0 (no retries)
  retryDelay?: number;  // Initial delay in ms (default: 1000)
}

/**
 * Get user-friendly error message based on status code and response data
 */
function getErrorMessage(status: number, data: any): string {
  // Try to extract error message from response
  const backendMessage = data?.error || data?.message;
  
  switch (status) {
    case 400:
      // Validation errors may have fields object
      if (data?.fields) {
        const fieldErrors = Object.entries(data.fields)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ');
        return `Validation failed: ${fieldErrors}`;
      }
      return backendMessage || 'Invalid request';
    
    case 401:
      return backendMessage || 'Unauthorized - please log in';
    
    case 403:
      return backendMessage || 'Forbidden - you do not have permission';
    
    case 409:
      return backendMessage || 'Conflict - resource already exists';
    
    case 500:
      return backendMessage || 'Server error - please try again later';
    
    case 503:
      return 'Service temporarily unavailable - retrying...';
    
    case 504:
      return 'Request timed out - retrying...';
    
    default:
      return backendMessage || `Request failed with status ${status}`;
  }
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(status: number, method: string): boolean {
  // Network errors (status 0) are retryable for GET requests only
  if (status === 0 && method === 'GET') return true;
  
  // 503 Service Unavailable and 504 Gateway Timeout are retryable
  if (status === 503 || status === 504) return true;
  
  // Never retry 4xx client errors (except 429 rate limit, but we don't handle that yet)
  if (status >= 400 && status < 500) return false;
  
  // Retry 5xx server errors for GET requests only
  if (status >= 500 && method === 'GET') return true;
  
  return false;
}

/**
 * Sleep for a given duration with exponential backoff
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make an HTTP request with automatic token injection and smart retry
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    requiresAuth = true,
    baseURL = ENV.API_BASE_URL,
    headers = {},
    maxRetries = 0,
    retryDelay = 1000,
    method = 'GET',
    ...fetchOptions
  } = options;

  let lastError: ApiError | null = null;
  
  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Build URL
      const url = `${baseURL}${endpoint}`;

      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers as Record<string, string>,
      };

      // Add JWT token if required
      if (requiresAuth) {
        const token = tokenStorage.getToken();
        if (!token) {
          throw new ApiError('No authentication token found', 401, undefined, false);
        }
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      // Add user context headers if authenticated
      const user = tokenStorage.getUser();
      if (user && requiresAuth) {
        requestHeaders['X-User-Id'] = user.id.toString();
        requestHeaders['X-Username'] = user.username;
      }

      const response = await fetch(url, {
        ...fetchOptions,
        method,
        headers: requestHeaders,
      });

      // Parse response body (may be JSON or empty)
      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          // Response is not JSON or empty
        }
      }

      // Handle 401 Unauthorized - clear token and redirect to login
      if (response.status === 401) {
        tokenStorage.clear();
        window.location.href = '/login';
        throw new ApiError(getErrorMessage(401, data), 401, data, false);
      }

      // Handle errors with user-friendly messages
      if (!response.ok) {
        const isRetryable = isRetryableError(response.status, method);
        const error = new ApiError(
          getErrorMessage(response.status, data),
          response.status,
          data,
          isRetryable
        );
        
        // If retryable and we have retries left, try again
        if (isRetryable && attempt < maxRetries) {
          lastError = error;
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Request failed (${response.status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
        
        throw error;
      }

      // Success!
      return data as T;
      
    } catch (error) {
      if (error instanceof ApiError) {
        // If it's retryable and we have retries left, continue
        if (error.isRetryable && attempt < maxRetries) {
          lastError = error;
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
        throw error;
      }
      
      // Network error or other fetch failure
      const networkError = new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        undefined,
        method === 'GET' // Network errors are retryable for GET requests
      );
      
      if (networkError.isRetryable && attempt < maxRetries) {
        lastError = networkError;
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      throw networkError;
    }
  }
  
  // If we exhausted all retries, throw the last error
  throw lastError || new ApiError('Request failed after retries', 0, undefined, false);
}

/**
 * Convenience methods with smart retry defaults
 */
export const httpClient = {
  /**
   * GET request with retry enabled by default (safe operation)
   */
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return apiRequest<T>(endpoint, { 
      maxRetries: 3, 
      retryDelay: 500, 
      ...options, 
      method: 'GET' 
    });
  },

  /**
   * POST request - retry disabled by default (not idempotent)
   * Override with maxRetries in options if needed
   */
  post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT request - retry disabled by default (not idempotent)
   */
  put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE request - retry disabled by default
   */
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
