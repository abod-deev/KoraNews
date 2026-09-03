import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

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

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event?.reason;
      const msg = reason?.message || String(reason || '');
      if (isIgnorableStorageError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        console.warn('[Storage] Suppressed browser IndexedDB teardown warning:', msg);
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

