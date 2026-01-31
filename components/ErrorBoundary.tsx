"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Log error to tracking service (e.g. Sentry, LogRocket)
    this.logErrorToService(error, errorInfo);
  }

  private async logErrorToService(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch("/api/tracking/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          info: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent
        }),
      });
    } catch (err) {
      console.error("Failed to log error to tracking service", err);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-600 mb-4">
            We&apos;ve been notified and are looking into it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
