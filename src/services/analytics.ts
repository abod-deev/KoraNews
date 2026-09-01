/**
 * Google Analytics 4 (GA4) Service for أخبار كرة القدم العالمية
 *
 * Provides complete tracking for:
 * - Page Views (with URL path, title, and referrer)
 * - User Sessions & Active Visitors
 * - Traffic Sources & Campaign UTM parameters
 * - Sports Interactions (reading articles, sharing, viewing matches, league filters)
 * - Authentication & Search events
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

// Google Analytics Measurement ID (Defaults to env variable or fallback placeholder)
export const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string) || '';

let isInitialized = false;

/**
 * Initialize Google Analytics 4
 * Automatically injects the gtag.js script if a Measurement ID is configured
 */
export function initGA(): void {
  if (typeof window === 'undefined' || isInitialized) return;

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }

  window.gtag('js', new Date());

  if (GA_MEASUREMENT_ID) {
    // Config with enhanced measurement
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We handle SPA page views manually via AnalyticsTracker
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
    });

    // Check if script is already present
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }
  }

  isInitialized = true;
}

/**
 * Track SPA Page Views
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined') return;

  initGA();

  const pageTitle = title || document.title;
  const pageLocation = window.location.href;

  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: pageTitle,
      page_location: pageLocation,
    });
  }

  // Dispatch custom event for internal real-time listeners (e.g., admin dashboard)
  window.dispatchEvent(
    new CustomEvent('ga4:page_view', {
      detail: { path, title: pageTitle, timestamp: Date.now() },
    })
  );
}

/**
 * Generic Event Tracker
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  initGA();

  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', eventName, params);
  }

  // Dispatch for in-app logs
  window.dispatchEvent(
    new CustomEvent('ga4:event', {
      detail: { eventName, params, timestamp: Date.now() },
    })
  );
}

/**
 * Specialized Trackers for أخبار كرة القدم العالمية
 */

export function trackNewsRead(articleId: string | number, title: string, category?: string): void {
  trackEvent('view_article', {
    article_id: String(articleId),
    article_title: title,
    category: category || 'sports_news',
    content_type: 'news',
  });
}

export function trackNewsShare(articleId: string | number, title: string, method: string = 'copy_link'): void {
  trackEvent('share', {
    method,
    content_type: 'news',
    item_id: String(articleId),
    item_name: title,
  });
}

export function trackMatchFilter(leagueId: string, date?: string, status?: string): void {
  trackEvent('filter_matches', {
    league_id: leagueId,
    selected_date: date || 'all',
    status: status || 'all',
  });
}

export function trackSearch(query: string, searchType: 'news' | 'matches' | 'teams' = 'news'): void {
  if (!query.trim()) return;
  trackEvent('search', {
    search_term: query.trim(),
    search_type: searchType,
  });
}

export function trackAuthEvent(action: 'login' | 'signup' | 'logout', method: string = 'email'): void {
  trackEvent(action, {
    method,
  });
}

export function trackLeagueView(leagueCode: string, leagueName?: string): void {
  trackEvent('view_league', {
    league_code: leagueCode,
    league_name: leagueName || leagueCode,
  });
}
