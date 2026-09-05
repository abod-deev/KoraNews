import {
  initFootballDb,
  syncMatchesCycle,
  syncNextLeagueStandingsCycle,
  refreshMemoryMatchesCache
} from './footballService.ts';

// Singleton guard on globalThis to prevent duplicate cron jobs across hot-reloads or re-imports
declare global {
  var __footballCronStarted: boolean | undefined;
  var __footballCronInterval: NodeJS.Timeout | undefined;
}

let syncCycleStep = 0; // 0 = Matches, 1 = Standings

/**
 * Starts the autonomous background sync worker.
 * Synchronizes every 20 seconds (3 requests per minute, well within 10 req/min free tier limit).
 * Prioritizes live matches and real-time scores, with rotating league standings.
 */
export function startCronJobs() {
  if (globalThis.__footballCronStarted) {
    console.log("[cronService] Cron worker already running, skipping duplicate initialization.");
    return;
  }
  globalThis.__footballCronStarted = true;

  if (globalThis.__footballCronInterval) {
    clearInterval(globalThis.__footballCronInterval);
    globalThis.__footballCronInterval = undefined;
  }

  console.log("[cronService] Initializing 20-second Live Football Data Sync Worker...");

  // 1. Initialize tables & warm-up cache
  setTimeout(async () => {
    try {
      await initFootballDb();
      await refreshMemoryMatchesCache();
      
      console.log("[cronService] Performing initial background bootstrap...");
      await syncMatchesCycle().catch((e) => console.warn("[cronService] Initial matches sync notice:", e.message || e));

      // Wait 4 seconds before fetching initial standings
      setTimeout(async () => {
        await syncNextLeagueStandingsCycle().catch((e) => console.warn("[cronService] Initial standings sync notice:", e.message || e));
      }, 4000);
    } catch (e: any) {
      console.warn("[cronService] Bootstrap warning:", e.message || e);
    }
  }, 2000);

  // 2. Precision 20-second interval = 3 requests per minute
  // 60,000ms / 3 = 20,000ms
  globalThis.__footballCronInterval = setInterval(async () => {
    try {
      if (syncCycleStep === 0) {
        // Step 1: Sync matches and live scores across competitions
        await syncMatchesCycle();
        syncCycleStep = 1;
      } else {
        // Step 2: Sync league standings in rotation
        await syncNextLeagueStandingsCycle();
        syncCycleStep = 0;
      }
    } catch (error: any) {
      console.warn("[cronService] Background 20s sync cycle warning:", error.message || error);
    }
  }, 20000);

  console.log("[cronService] 20-second live background worker active (3 req/min).");
}
