/**
 * Error Boundary Component
 * Catches React component errors and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'root' | 'page' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.MODE === 'development') {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    // Send to error tracking service in production
    if (import.meta.env.MODE === 'production') {
      // TODO: Integrate with Sentry or similar
      // Sentry.captureException(error, { extra: errorInfo });
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (!hasError) {
      return children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Root-level error boundary (full page crash)
    if (level === 'root') {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full bg-slate-900 border-red-900 p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-slate-400 mb-6">
                We're sorry, but the application encountered an unexpected error.
              </p>

              {import.meta.env.MODE === 'development' && error && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 text-left">
                  <p className="text-red-400 font-mono text-sm mb-2">
                    {error.toString()}
                  </p>
                  {errorInfo && (
                    <details className="text-slate-400 text-xs font-mono">
                      <summary className="cursor-pointer hover:text-white">
                        Stack trace
                      </summary>
                      <pre className="mt-2 overflow-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="border-slate-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Page-level error boundary
    if (level === 'page') {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-lg w-full bg-slate-800 border-red-900 p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white mb-1">
                  Page Error
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  This page encountered an error and couldn't load properly.
                </p>
                
                {import.meta.env.MODE === 'development' && error && (
                  <p className="text-red-400 font-mono text-xs mb-4 bg-slate-900 p-2 rounded">
                    {error.toString()}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={this.handleReset}
                    size="sm"
                    variant="outline"
                    className="border-slate-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Home className="w-3 h-3 mr-1" />
                    Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Component-level error boundary (minimal)
    return (
      <div className="bg-slate-800 border border-red-900 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium text-sm">Component Error</span>
        </div>
        {import.meta.env.MODE === 'development' && error && (
          <p className="text-slate-400 text-xs font-mono mb-3">
            {error.toString()}
          </p>
        )}
        <Button
          onClick={this.handleReset}
          size="sm"
          variant="outline"
          className="border-slate-700"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }
}
