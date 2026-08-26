import {
  initFootballDb,
  syncMatchesCycle,
  syncNextLeagueStandingsCycle,
  refreshMemoryMatchesCache
} from './footballService.ts';

let syncIntervalHandle: NodeJS.Timeout | null = null;
let syncCycleStep = 0; // 0 = Matches, 1 = Standings

/**
 * Starts the autonomous background sync worker.
 * Synchronizes every 20 seconds (3 requests per minute, well within 10 req/min free tier limit).
 * Prioritizes live matches and real-time scores, with rotating league standings.
 */
export function startCronJobs() {
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

  // 2. Clear any existing interval to prevent duplicates
  if (syncIntervalHandle) {
    clearInterval(syncIntervalHandle);
  }

  // 3. Precision 20-second interval = 3 requests per minute
  // 60,000ms / 3 = 20,000ms
  syncIntervalHandle = setInterval(async () => {
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
