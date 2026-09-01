import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, initGA } from '../../services/analytics';

/**
 * AnalyticsTracker
 * Automatically initializes GA4 and sends page_view hits on every React Router location change
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    // Slight timeout to ensure document.title is updated by any useSEO hook
    const timer = setTimeout(() => {
      trackPageView(location.pathname + location.search, document.title);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
