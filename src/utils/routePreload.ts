/**
 * Route Preloader Utility
 * Preloads page bundles in background during browser idle time
 * and on hover/touch over navigation items to eliminate page transition delays.
 */

const routeImportMap: Record<string, () => Promise<any>> = {
  '/': () => import('../pages/Home'),
  '/news': () => import('../pages/News'),
  '/matches': () => import('../pages/Matches'),
  '/predictions': () => import('../pages/Predictions'),
  '/predictions/leaderboard': () => import('../pages/PredictionsLeaderboardPage'),
  '/predictions/golden': () => import('../pages/GoldenLeaderboardPage'),
  '/login': () => import('../pages/Login'),
};

const preloadedRoutes = new Set<string>();

export function preloadRoute(path: string): void {
  const cleanPath = path.split('?')[0];
  if (preloadedRoutes.has(cleanPath)) return;

  const importer = routeImportMap[cleanPath];
  if (importer) {
    preloadedRoutes.add(cleanPath);
    importer().catch(() => {
      preloadedRoutes.delete(cleanPath);
    });
  }
}

/**
 * Preloads key secondary routes during idle time after initial page mount.
 */
export function initializeIdlePreload(): void {
  if (typeof window === 'undefined') return;

  const idleCallback = () => {
    const mainRoutes = ['/news', '/matches', '/predictions'];
    mainRoutes.forEach((route, idx) => {
      setTimeout(() => {
        preloadRoute(route);
      }, 500 + idx * 400);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(idleCallback, { timeout: 4000 });
  } else {
    setTimeout(idleCallback, 1500);
  }
}
