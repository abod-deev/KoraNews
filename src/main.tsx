import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Intercept benign browser / indexedDB teardown & visibility change errors (e.g. iframe refresh or background tab)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = reason?.message || String(reason || '');
    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('backing store') ||
      msg.includes('indexedDB') ||
      msg.includes('IndexedDB')
    ) {
      event.preventDefault();
      console.warn('[Storage] Suppressed browser IndexedDB teardown warning:', msg);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || String(event?.error?.message || '');
    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('backing store')
    ) {
      event.preventDefault();
      console.warn('[Storage] Handled browser background storage event:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

