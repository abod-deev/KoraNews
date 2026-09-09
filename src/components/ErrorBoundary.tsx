import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Handles automatic recovery on runtime errors:
 * 1. Automatically attempts to reload the page once.
 * 2. If an error persists on the same route, automatically redirects to the home page ('/').
 * 3. Prevents infinite reload loops using a short-lived sessionStorage tracker.
 */
function handleAutoRecovery(): void {
  if (typeof window === 'undefined') return;

  try {
    const currentPath = window.location.pathname;
    const now = Date.now();
    const stored = sessionStorage.getItem('app_auto_recovery');
    let retryInfo: { path: string; count: number; timestamp: number } | null = null;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.count === 'number' && parsed.path === currentPath) {
          // If within the last 15 seconds on the same page
          if (now - parsed.timestamp < 15000) {
            retryInfo = parsed;
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }

    if (!retryInfo || retryInfo.count < 1) {
      // First error on this path: record and automatically reload the page
      sessionStorage.setItem(
        'app_auto_recovery',
        JSON.stringify({ path: currentPath, count: 1, timestamp: now })
      );
      window.location.reload();
    } else {
      // Second consecutive error: navigate back to the home page
      sessionStorage.removeItem('app_auto_recovery');
      if (currentPath !== '/') {
        window.location.replace('/');
      } else {
        // If already on the home page, perform one clean reload
        window.location.reload();
      }
    }
  } catch {
    // Fallback if sessionStorage is disabled or unavailable
    if (window.location.pathname !== '/') {
      window.location.replace('/');
    } else {
      window.location.reload();
    }
  }
}

class ErrorBoundary extends Component<Props, State> {
  private recoveryTriggered = false;

  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = String(error?.message || error || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('backing store') ||
      msg.includes('indexeddb') ||
      msg.includes('idbdatabase')
    ) {
      console.warn('[ErrorBoundary] Ignored benign background storage teardown:', msg);
      return;
    }

    if (
      msg.includes('dynamically imported module') ||
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk')
    ) {
      console.warn('[ErrorBoundary] Chunk loading issue detected, initiating auto-recovery:', msg);
      if (!this.recoveryTriggered) {
        this.recoveryTriggered = true;
        handleAutoRecovery();
      }
      return;
    }

    console.error('[ErrorBoundary] Uncaught component error caught:', error, errorInfo);

    if (!this.recoveryTriggered) {
      this.recoveryTriggered = true;
      handleAutoRecovery();
    }
  }

  public componentDidMount() {
    if (this.state.hasError && !this.recoveryTriggered) {
      this.recoveryTriggered = true;
      handleAutoRecovery();
    }
  }

  public componentDidUpdate(_prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError && !this.recoveryTriggered) {
      this.recoveryTriggered = true;
      handleAutoRecovery();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mb-4" />
          <p className="text-slate-700 dark:text-slate-200 font-bold text-sm mb-4">
            جاري تحديث الصفحة والعودة...
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sessionStorage.removeItem('app_auto_recovery');
                window.location.replace('/');
              }}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>العودة للصفحة الرئيسية</span>
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('app_auto_recovery');
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;

