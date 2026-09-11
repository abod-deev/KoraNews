/**
 * Client-Side Error Logging Utility
 * Reports uncaught errors, unhandled rejections, and UI issues to /api/errors/report
 */

interface ErrorReportPayload {
  message: string;
  stack?: string;
  source?: string;
  severity?: 'fatal' | 'error' | 'warning' | 'info';
  endpoint?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
}

// Simple debounce/dedup cache to prevent spamming reports for repeated client errors
const reportedErrorsCache = new Set<string>();

export async function reportClientError(payload: ErrorReportPayload): Promise<void> {
  if (typeof window === 'undefined') return;

  const key = `${payload.source || 'client'}-${payload.message}-${payload.endpoint || window.location.pathname}`;
  if (reportedErrorsCache.has(key)) return;

  reportedErrorsCache.add(key);
  // Clear from cache after 30 seconds to allow reporting again if it reoccurs later
  setTimeout(() => {
    reportedErrorsCache.delete(key);
  }, 30000);

  try {
    const token = localStorage.getItem('srv_session_token') || sessionStorage.getItem('srv_session_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch('/api/errors/report', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: payload.source || 'client',
        severity: payload.severity || 'error',
        message: payload.message,
        stack: payload.stack,
        endpoint: payload.endpoint || window.location.pathname + window.location.search,
        statusCode: payload.statusCode || 500,
        metadata: {
          ...payload.metadata,
          url: window.location.href,
          userAgent: navigator.userAgent,
          screenResolution: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch (err) {
    // Non-blocking failure
    console.warn('[ErrorLogger] Failed to transmit client error to server:', err);
  }
}
