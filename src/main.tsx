import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { reportClientError } from './utils/errorLogger.ts';

// Intercept benign browser / indexedDB teardown & visibility change errors (e.g. iframe refresh or background tab)
if (typeof window !== 'undefined') {
  const isIgnorableStorageError = (msg: string) => {
    const text = String(msg || '').toLowerCase();
    return (
      text.includes('database is closing') ||
      text.includes('closing/hidden') ||
      text.includes('backing store') ||
      text.includes('indexeddb') ||
      text.includes('idbdatabase')
    );
  };

  const isChunkLoadError = (msg: string) => {
    const text = String(msg || '').toLowerCase();
    return (
      text.includes('failed to fetch dynamically imported module') ||
      text.includes('loading chunk') ||
      text.includes('dynamically imported module') ||
      text.includes('error loading dynamically imported module')
    );
  };

  const handleGlobalRecovery = () => {
    try {
      const currentPath = window.location.pathname;
      const now = Date.now();
      const stored = sessionStorage.getItem('app_auto_recovery');
      let count = 0;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.path === currentPath && (now - parsed.timestamp) < 15000) {
            count = parsed.count;
          }
        } catch {}
      }

      if (count < 1) {
        sessionStorage.setItem('app_auto_recovery', JSON.stringify({ path: currentPath, count: 1, timestamp: now }));
        window.location.reload();
      } else {
        sessionStorage.removeItem('app_auto_recovery');
        if (currentPath !== '/') {
          window.location.replace('/');
        } else {
          window.location.reload();
        }
      }
    } catch {
      window.location.replace('/');
    }
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event?.reason;
      const msg = reason?.message || String(reason || '');
      if (isIgnorableStorageError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        console.warn('[Storage] Suppressed browser IndexedDB teardown warning:', msg);
        return;
      }
      reportClientError({
        source: 'client_promise',
        severity: 'error',
        message: msg,
        stack: reason?.stack,
      });
      if (isChunkLoadError(msg)) {
        event.preventDefault();
        handleGlobalRecovery();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      const msg = event?.message || String(event?.error?.message || '');
      if (isIgnorableStorageError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        console.warn('[Storage] Handled browser background storage event:', msg);
        return;
      }
      reportClientError({
        source: 'client_runtime',
        severity: 'error',
        message: msg,
        stack: event?.error?.stack,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
      if (isChunkLoadError(msg)) {
        event.preventDefault();
        handleGlobalRecovery();
      }
    },
    true
  );

  const prevOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = String(message || error?.message || '');
    if (isIgnorableStorageError(msg)) {
      return true; // suppresses error reporting to runner
    }
    if (isChunkLoadError(msg)) {
      handleGlobalRecovery();
      return true;
    }
    if (typeof prevOnError === 'function') {
      return prevOnError(message, source, lineno, colno, error);
    }
    return false;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

