import { db, withDbRetry } from "../db/index.ts";
import { matches, teams, leagues, standingsCache } from "../db/schema.ts";
import { eq, sql, lt, desc } from "drizzle-orm";
import { fetchFromFootballData, RateLimitError } from "./footballApi.ts";
import { getArabicTeamName, translateTeamName, TEAM_AR_NAMES } from "../utils/teamTranslations.ts";
import { PRE_STORED_LEAGUES, PRE_STORED_STANDINGS, PRE_STORED_MATCHES_TEMPLATE, SeedMatchItem } from "./seedData.ts";

export { getArabicTeamName, translateTeamName, TEAM_AR_NAMES };

// All 13 Free Tier Supported Competitions in Football-Data.org
export const SUPPORTED_LEAGUES = [
  'PL',   // Premier League (England)
  'PD',   // La Liga (Spain)
  'SA',   // Serie A (Italy)
  'BL1',  // Bundesliga (Germany)
  'FL1',  // Ligue 1 (France)
  'CL',   // UEFA Champions League (Europe)
  'ELC',  // Championship (England)
  'DED',  // Eredivisie (Netherlands)
  'PPL',  // Primeira Liga (Portugal)
  'BSA',  // Brasileirão Série A (Brazil)
  'CLI',  // Copa Libertadores (South America)
  'EC',   // European Championship
  'WC',   // FIFA World Cup
];

// Competitions that have seasonal league standings tables
export const STANDINGS_SUPPORTED_LEAGUES = [
  'PL',
  'PD',
  'SA',
  'BL1',
  'FL1',
  'CL',
  'ELC',
  'DED',
  'PPL',
  'BSA',
  'CLI',
  'EC',
  'WC',
];

export const CODE_TO_ID: Record<string, string> = {
  'PL': '2021',
  'PD': '2014',
  'SA': '2019',
  'BL1': '2002',
  'FL1': '2015',
  'CL': '2001',
  'ELC': '2016',
  'DED': '2003',
  'PPL': '2017',
  'BSA': '2013',
  'CLI': '2013',
  'EC': '2018',
  'WC': '2000',
};

export const ID_TO_CODE: Record<string, string> = {
  '2021': 'PL',
  '2014': 'PD',
  'l1': 'PD',
  '2019': 'SA',
  '2002': 'BL1',
  '2015': 'FL1',
  '2001': 'CL',
  '2016': 'ELC',
  '2003': 'DED',
  '2017': 'PPL',
  '2013': 'BSA',
  '2018': 'EC',
  '2000': 'WC',
};

// League Code / ID map to Football-Data API codes
export const COMPETITION_CODE_MAP: Record<string, string> = {
  ...ID_TO_CODE,
  'PL': 'PL',
  'PD': 'PD',
  'SA': 'SA',
  'BL1': 'BL1',
  'FL1': 'FL1',
  'CL': 'CL',
  'ELC': 'ELC',
  'DED': 'DED',
  'PPL': 'PPL',
  'BSA': 'BSA',
  'CLI': 'CLI',
  'WC': 'WC',
  'EC': 'EC',
};

export const LEAGUE_AR_NAMES: Record<string, string> = {
  'PL': 'الدوري الإنجليزي الممتاز',
  '2021': 'الدوري الإنجليزي الممتاز',
  'PD': 'الدوري الإسباني',
  '2014': 'الدوري الإسباني',
  'l1': 'الدوري الإسباني',
  'SA': 'الدوري الإيطالي',
  '2019': 'الدوري الإيطالي',
  'BL1': 'الدوري الألماني',
  '2002': 'الدوري الألماني',
  'FL1': 'الدوري الفرنسي',
  '2015': 'الدوري الفرنسي',
  'CL': 'دوري أبطال أوروبا',
  '2001': 'دوري أبطال أوروبا',
  'ELC': 'دوري البطولة الإنجليزية',
  '2016': 'دوري البطولة الإنجليزية',
  'DED': 'الدوري الهولندي',
  '2003': 'الدوري الهولندي',
  'PPL': 'الدوري البرتغالي',
  '2017': 'الدوري البرتغالي',
  'BSA': 'الدوري البرازيلي',
  '2013': 'الدوري البرازيلي',
  'CLI': 'كأس ليبرتادوريس',
  'EC': 'بطولة أمم أوروبا',
  '2018': 'بطولة أمم أوروبا',
  'WC': 'كأس العالم',
  '2000': 'كأس العالم',
};

export const ALL_FREE_LEAGUES_LIST = [
  { id: 'all', code: 'all', name: 'جميع الدوريات', flag: '🌐', logo: '' },
  { id: 'PL', code: 'PL', name: 'الدوري الإنجليزي الممتاز', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', logo: 'https://crests.football-data.org/PL.png' },
  { id: 'PD', code: 'PD', name: 'الدوري الإسباني', flag: '🇪🇸', logo: 'https://crests.football-data.org/PD.png' },
  { id: 'SA', code: 'SA', name: 'الدوري الإيطالي', flag: '🇮🇹', logo: 'https://crests.football-data.org/SA.png' },
  { id: 'BL1', code: 'BL1', name: 'الدوري الألماني', flag: '🇩🇪', logo: 'https://crests.football-data.org/BL1.png' },
  { id: 'FL1', code: 'FL1', name: 'الدوري الفرنسي', flag: '🇫🇷', logo: 'https://crests.football-data.org/FL1.png' },
  { id: 'CL', code: 'CL', name: 'دوري أبطال أوروبا', flag: '🇪🇺', logo: 'https://crests.football-data.org/CL.png' },
  { id: 'ELC', code: 'ELC', name: 'دوري البطولة الإنجليزية', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', logo: 'https://crests.football-data.org/ELC.png' },
  { id: 'DED', code: 'DED', name: 'الدوري الهولندي', flag: '🇳🇱', logo: 'https://crests.football-data.org/DED.png' },
  { id: 'PPL', code: 'PPL', name: 'الدوري البرتغالي', flag: '🇵🇹', logo: 'https://crests.football-data.org/PPL.png' },
  { id: 'BSA', code: 'BSA', name: 'الدوري البرازيلي', flag: '🇧🇷', logo: 'https://crests.football-data.org/BSA.png' },
  { id: 'CLI', code: 'CLI', name: 'كأس ليبرتادوريس', flag: '🌎', logo: 'https://crests.football-data.org/CLI.png' },
  { id: 'EC', code: 'EC', name: 'بطولة أمم أوروبا', flag: '🏆', logo: 'https://crests.football-data.org/EC.png' },
  { id: 'WC', code: 'WC', name: 'كأس العالم', flag: '🌍', logo: 'https://crests.football-data.org/WC.png' },
];

// In-memory Fast Caches for Standings and Matches (Sub-millisecond access for users)
const memoryStandingsCache = new Map<string, { data: any[]; timestamp: number }>();
let memoryMatchesCache: any[] = [];
let lastMatchesSyncTimestamp = 0;

// Rotating indexes for the background scheduler
let currentStandingsLeagueIndex = 0;
let currentMatchesLeagueIndex = 0;

/**
 * Initializes database tables, default leagues, teams, standings, and matches for all 13 leagues.
 * Ensures zero-latency database ready state on startup.
 */
export async function initFootballDb() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS standings_cache (
        league_id TEXT PRIMARY KEY,
        season TEXT NOT NULL DEFAULT '2026',
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 1. Seed all supported leagues in the leagues table
    for (const lg of ALL_FREE_LEAGUES_LIST) {
      if (lg.id === 'all') continue;
      const existing = await db.select().from(leagues).where(eq(leagues.id, lg.id));
      if (existing.length === 0) {
        await db.insert(leagues).values({
          id: lg.id,
          name: lg.name,
          logo: lg.logo,
        }).catch(() => null);
      }
    }

    // 2. Seed / ensure standings for ALL 13 leagues in DB & memory cache
    for (const [leagueCode, standingsList] of Object.entries(PRE_STORED_STANDINGS)) {
      // Put in memory cache immediately
      if (!memoryStandingsCache.has(leagueCode)) {
        memoryStandingsCache.set(leagueCode, { data: standingsList, timestamp: Date.now() });
      }

      // Check DB
      const existingStanding = await db.select().from(standingsCache).where(eq(standingsCache.leagueId, leagueCode)).catch(() => []);
      if (existingStanding.length === 0) {
        await db.insert(standingsCache).values({
          leagueId: leagueCode,
          season: '2026',
          data: standingsList,
          updatedAt: new Date(),
        }).catch(() => null);
      }

      // Ensure all teams from standings are in teams table
      for (const item of standingsList) {
        if (item.team && item.team.id) {
          const existingTeam = await db.select().from(teams).where(eq(teams.id, item.team.id)).catch(() => []);
          if (existingTeam.length === 0) {
            await db.insert(teams).values({
              id: item.team.id,
              name: item.team.name,
              logo: item.team.logo,
            }).catch(() => null);
          }
        }
      }
    }

    // 3. Seed / ensure comprehensive matches in DB
    const existingMatches = await db.select().from(matches).limit(10).catch(() => []);
    if (existingMatches.length < 5) {
      console.log("[footballService] Pre-populating matches table with complete schedule across all 13 leagues...");
      const now = new Date();

      for (const tpl of PRE_STORED_MATCHES_TEMPLATE) {
        try {
          // Ensure home and away teams in teams table
          for (const teamObj of [tpl.homeTeam, tpl.awayTeam]) {
            const teamCheck = await db.select().from(teams).where(eq(teams.id, teamObj.id)).catch(() => []);
            if (teamCheck.length === 0) {
              await db.insert(teams).values({
                id: teamObj.id,
                name: teamObj.name,
                logo: teamObj.logo,
              }).catch(() => null);
            }
          }

          // Calculate realistic match date/time
          const matchDate = new Date(now);
          matchDate.setDate(now.getDate() + tpl.dateOffsetDays);
          matchDate.setUTCHours(tpl.hourUtc, tpl.minuteUtc, 0, 0);

          let matchTimeStr = tpl.matchTime;
          if (tpl.status === 'SCHEDULED') {
            matchTimeStr = matchDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          }

          const existingM = await db.select().from(matches).where(eq(matches.id, tpl.id)).catch(() => []);
          if (existingM.length === 0) {
            await db.insert(matches).values({
              id: tpl.id,
              leagueId: tpl.leagueId,
              homeTeamId: tpl.homeTeam.id,
              awayTeamId: tpl.awayTeam.id,
              homeScore: tpl.homeScore,
              awayScore: tpl.awayScore,
              status: tpl.status,
              matchTime: matchTimeStr,
              matchDate: matchDate,
              source: 'pre-seeded',
              updatedAt: new Date(),
            }).catch(() => null);
          }
        } catch (mErr) {
          // continue
        }
      }
    }

    await refreshMemoryMatchesCache();
    console.log("[footballService] Pre-stored database initialization complete for all 13 leagues.");
  } catch (err: any) {
    console.warn("[footballService] Table init notice:", err.message || err);
  }
}

/**
 * Clean outdated matches from database (older than 14 days) to keep DB performant & clean
 */
export async function cleanOldMatchesFromDb() {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    await withDbRetry(() => db.delete(matches).where(lt(matches.matchDate, fourteenDaysAgo)));
    console.log("[footballService] Old historical matches pruned from DB.");
  } catch (err: any) {
    console.warn("[footballService] Pruning old matches notice:", err.message || err);
  }
}

/**
 * Cycle 1: Fetch and Sync Matches across ALL Free Tier Competitions.
 * Runs once every minute (part of the 2 req/min budget).
 * Deletes stale records, fetches live and upcoming matches for all free tier leagues, and saves to DB.
 */
export async function syncMatchesCycle() {
  console.log("[footballSync] Running Global Matches Sync Cycle for all free competitions...");
  try {
    const dateFrom = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]; // past 2 days
    const dateTo = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];   // next 7 days
    const competitionsParam = SUPPORTED_LEAGUES.join(',');

    // 1. Fetch matches from API across all free competitions in the date window
    let data = await fetchFromFootballData(`/matches?competitions=${competitionsParam}&dateFrom=${dateFrom}&dateTo=${dateTo}`, { ignoreCache: true }).catch(() => null);
    
    // Fallback: if no matches or empty, fetch live / in play
    if (!data || !data.matches || data.matches.length === 0) {
      data = await fetchFromFootballData(`/matches?competitions=${competitionsParam}&status=IN_PLAY,PAUSED,LIVE,SCHEDULED`, { ignoreCache: true }).catch(() => null);
    }

    // Secondary fallback without competitions filter if needed
    if (!data || !data.matches || data.matches.length === 0) {
      data = await fetchFromFootballData(`/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, { ignoreCache: true }).catch(() => null);
    }

    if (data && Array.isArray(data.matches) && data.matches.length > 0) {
      console.log(`[footballSync] Fetched ${data.matches.length} fresh matches across all free tier leagues.`);
      
      // Clean old records before storing new ones
      await cleanOldMatchesFromDb();

      // Store in DB
      await processAndStoreMatches(data.matches);

      // Refresh memory matches cache from DB
      await refreshMemoryMatchesCache();
    } else {
      console.log("[footballSync] No matches returned in current window, rotating to individual league sync.");
      await syncSpecificLeagueMatches(SUPPORTED_LEAGUES[currentMatchesLeagueIndex % SUPPORTED_LEAGUES.length]);
      currentMatchesLeagueIndex++;
    }
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      console.warn(`[footballSync] Rate limit throttle for matches: ${err.message}`);
    } else {
      console.warn("[footballSync] Match sync error:", err.message || err);
    }
  }
}

/**
 * Syncs full season / scheduled matches for a specific league into DB.
 * If the current season has not started or has no matches, falls back to previous seasons.
 */
export async function syncSpecificLeagueMatches(leagueCode: string) {
  try {
    const code = COMPETITION_CODE_MAP[leagueCode] || ID_TO_CODE[leagueCode] || leagueCode;
    console.log(`[footballSync] Syncing matches for specific league [${code}]...`);
    
    // Try current season first, then fallback to previous seasons (e.g. 2025, 2024, 2023, 2022)
    const currentYear = new Date().getFullYear();
    const seasonsToTry: (string | undefined)[] = [undefined];
    for (let yr = currentYear; yr >= currentYear - 4; yr--) {
      seasonsToTry.push(String(yr));
    }

    for (const seasonAttempt of seasonsToTry) {
      try {
        const endpoint = seasonAttempt 
          ? `/competitions/${code}/matches?season=${seasonAttempt}` 
          : `/competitions/${code}/matches`;
        
        const data = await fetchFromFootballData(endpoint, { ignoreCache: true }).catch(() => null);
        if (data && Array.isArray(data.matches) && data.matches.length > 0) {
          await processAndStoreMatches(data.matches);
          console.log(`[footballSync] Stored ${data.matches.length} matches for [${code}] (season ${seasonAttempt || 'current'}) in DB.`);
          await refreshMemoryMatchesCache();
          return;
        }
      } catch (seasonErr) {
        // Continue to next season attempt
      }
    }
  } catch (e: any) {
    console.warn(`[footballSync] Could not sync matches for league ${leagueCode}:`, e.message || e);
  }
}

/**
 * Cycle 2: Fetch and Sync Standings for the next League in rotation.
 * Runs once every minute (part of the 2 req/min budget).
 * Saves to DB & replaces old standings for that league.
 * Falls back to previous seasons if tournament has not started.
 */
export async function syncNextLeagueStandingsCycle() {
  const targetLeague = STANDINGS_SUPPORTED_LEAGUES[currentStandingsLeagueIndex % STANDINGS_SUPPORTED_LEAGUES.length];
  currentStandingsLeagueIndex++;

  console.log(`[footballSync] Running Standings Sync Cycle for league [${targetLeague}] (2/2 requests per minute)...`);
  try {
    const standingsData = await fetchStandingsFromApi(targetLeague);
    if (standingsData && standingsData.length > 0) {
      // Store into memory cache
      memoryStandingsCache.set(targetLeague, { data: standingsData, timestamp: Date.now() });

      // Store / overwrite in DB
      try {
        await withDbRetry(() => db.insert(standingsCache).values({
          leagueId: targetLeague,
          season: 'current',
          data: standingsData,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: standingsCache.leagueId,
          set: {
            data: standingsData,
            season: 'current',
            updatedAt: new Date(),
          }
        }));
        console.log(`[footballSync] Standings for [${targetLeague}] successfully updated and saved in DB (${standingsData.length} teams).`);
      } catch (dbErr: any) {
        console.warn(`[footballSync] DB write notice for standings [${targetLeague}]:`, dbErr.message || dbErr);
      }
    }
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      console.warn(`[footballSync] Rate limit throttle for standings: ${err.message}`);
    } else {
      console.warn(`[footballSync] Notice syncing standings for ${targetLeague}:`, err.message || err);
    }
  }
}

/**
 * Refreshes the local in-memory matches cache directly from the DB
 */
export async function refreshMemoryMatchesCache() {
  try {
    const rows = await db.query.matches.findMany({
      with: {
        league: true,
        homeTeam: true,
        awayTeam: true
      },
      orderBy: [desc(matches.matchDate)]
    });

    if (rows && rows.length > 0) {
      memoryMatchesCache = rows;
      lastMatchesSyncTimestamp = Date.now();
    }
  } catch (err: any) {
    console.warn("[footballService] Refresh memory cache warning:", err.message || err);
  }
}

/**
 * Processes raw matches from API and inserts/updates them into DB
 */
async function processAndStoreMatches(apiMatches: any[]) {
  for (const apiMatch of apiMatches) {
    if (!apiMatch || !apiMatch.id || !apiMatch.homeTeam || !apiMatch.awayTeam) continue;
    try {
      // 1. Determine Standard Normalized League Code
      const rawCode = apiMatch.competition?.code || '';
      const rawId = apiMatch.competition?.id ? String(apiMatch.competition.id) : '';
      const normalizedLeagueCode = ID_TO_CODE[rawId] || COMPETITION_CODE_MAP[rawCode] || rawCode || 'PL';
      const arabicLeagueName = LEAGUE_AR_NAMES[normalizedLeagueCode] || LEAGUE_AR_NAMES[rawCode] || LEAGUE_AR_NAMES[rawId] || apiMatch.competition?.name || 'بطولة عالمية';
      const leagueEmblem = apiMatch.competition?.emblem || `https://crests.football-data.org/${normalizedLeagueCode}.png`;

      // Upsert league with normalized ID
      const existingLeague = await db.select().from(leagues).where(eq(leagues.id, normalizedLeagueCode));
      if (existingLeague.length === 0) {
        await db.insert(leagues).values({
          id: normalizedLeagueCode,
          name: arabicLeagueName,
          logo: leagueEmblem,
        }).catch(() => null);
      } else if (existingLeague[0].name !== arabicLeagueName) {
        await db.update(leagues).set({ name: arabicLeagueName, logo: leagueEmblem }).where(eq(leagues.id, normalizedLeagueCode)).catch(() => null);
      }

      // Also upsert numeric rawId if different, so relational joins by numeric ID work seamlessly
      if (rawId && rawId !== normalizedLeagueCode) {
        const existingRawLeague = await db.select().from(leagues).where(eq(leagues.id, rawId));
        if (existingRawLeague.length === 0) {
          await db.insert(leagues).values({
            id: rawId,
            name: arabicLeagueName,
            logo: leagueEmblem,
          }).catch(() => null);
        }
      }

      // 2. Ensure Home Team exists with accurate Arabic name
      const homeTeamId = String(apiMatch.homeTeam.id);
      const homeTeamArName = getArabicTeamName(apiMatch.homeTeam.name);
      const homeTeamCrest = apiMatch.homeTeam.crest || 'https://via.placeholder.com/60/cccccc/808080?text=?';

      const existingHome = await db.select().from(teams).where(eq(teams.id, homeTeamId));
      if (existingHome.length === 0) {
        await db.insert(teams).values({
          id: homeTeamId,
          name: homeTeamArName,
          logo: homeTeamCrest,
        }).catch(() => null);
      } else {
        await db.update(teams).set({ name: homeTeamArName, logo: homeTeamCrest }).where(eq(teams.id, homeTeamId)).catch(() => null);
      }

      // 3. Ensure Away Team exists with accurate Arabic name
      const awayTeamId = String(apiMatch.awayTeam.id);
      const awayTeamArName = getArabicTeamName(apiMatch.awayTeam.name);
      const awayTeamCrest = apiMatch.awayTeam.crest || 'https://via.placeholder.com/60/cccccc/808080?text=?';

      const existingAway = await db.select().from(teams).where(eq(teams.id, awayTeamId));
      if (existingAway.length === 0) {
        await db.insert(teams).values({
          id: awayTeamId,
          name: awayTeamArName,
          logo: awayTeamCrest,
        }).catch(() => null);
      } else {
        await db.update(teams).set({ name: awayTeamArName, logo: awayTeamCrest }).where(eq(teams.id, awayTeamId)).catch(() => null);
      }

      // 4. Upsert Match with normalizedLeagueCode
      const matchId = String(apiMatch.id);
      let normalizedStatus = 'SCHEDULED';
      if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(apiMatch.status)) {
        normalizedStatus = 'LIVE';
      } else if (apiMatch.status === 'FINISHED') {
        normalizedStatus = 'FINISHED';
      }

      const matchDateObj = new Date(apiMatch.utcDate || new Date());
      let formattedTime = '00:00';
      if (!isNaN(matchDateObj.getTime())) {
        formattedTime = matchDateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      }

      const matchData = {
        leagueId: normalizedLeagueCode,
        homeTeamId,
        awayTeamId,
        homeScore: apiMatch.score?.fullTime?.home ?? (apiMatch.score?.halfTime?.home ?? null),
        awayScore: apiMatch.score?.fullTime?.away ?? (apiMatch.score?.halfTime?.away ?? null),
        status: normalizedStatus,
        matchTime: normalizedStatus === 'LIVE' ? "مباشر" : (normalizedStatus === 'FINISHED' ? 'انتهت' : formattedTime),
        matchDate: matchDateObj,
        source: 'football-data.org',
        updatedAt: new Date(),
      };

      const existingMatch = await db.select().from(matches).where(eq(matches.id, matchId));
      if (existingMatch.length === 0) {
        await db.insert(matches).values({
          id: matchId,
          ...matchData,
        }).catch(() => null);
      } else {
        await db.update(matches).set(matchData).where(eq(matches.id, matchId)).catch(() => null);
      }
    } catch (itemErr) {
      console.warn("[footballService] Match process item error:", itemErr);
    }
  }
}

/**
 * Returns stored matches directly from DB (0 external API requests for user).
 * Handles filtering and sorting across ALL free tier leagues.
 */
export async function getStoredMatches(filters: {
  status?: string;
  date?: string;
  leagueId?: string;
  season?: string;
  sortBy?: string;
}) {
  const { status, date, leagueId, sortBy } = filters;

  // Retrieve matches from DB
  let allMatches = await db.query.matches.findMany({
    with: {
      league: true,
      homeTeam: true,
      awayTeam: true
    },
    orderBy: [desc(matches.matchDate)]
  });

  // If DB is completely empty (e.g. initial setup), trigger sync and retry
  if (allMatches.length === 0) {
    await syncMatchesCycle();
    allMatches = await db.query.matches.findMany({
      with: {
        league: true,
        homeTeam: true,
        awayTeam: true
      },
      orderBy: [desc(matches.matchDate)]
    });
  }

  let result = allMatches;

  // 1. Status Filter
  if (status) {
    if (status === 'LIVE' || status === 'IN_PLAY') {
      result = result.filter(m => ['LIVE', 'IN_PLAY', 'PAUSED'].includes(m.status));
    } else {
      result = result.filter(m => m.status === status);
    }
  }

  // 2. League Filter (Bidirectional matching across code and id)
  if (leagueId && leagueId !== 'all') {
    const targetCode = COMPETITION_CODE_MAP[leagueId] || ID_TO_CODE[leagueId] || leagueId;
    const targetId = CODE_TO_ID[targetCode] || CODE_TO_ID[leagueId] || leagueId;

    let leagueMatches = result.filter(m => {
      const mLeague = m.leagueId;
      const mCode = m.league?.id;
      return (
        mLeague === leagueId ||
        mLeague === targetCode ||
        mLeague === targetId ||
        mCode === leagueId ||
        mCode === targetCode ||
        mCode === targetId
      );
    });

    // If no matches for this specific league in DB, populate from pre-stored template immediately
    if (leagueMatches.length === 0) {
      const leagueTemplates = PRE_STORED_MATCHES_TEMPLATE.filter(t => t.leagueId === targetCode || t.leagueId === leagueId);
      if (leagueTemplates.length > 0) {
        const now = new Date();
        for (const tpl of leagueTemplates) {
          const matchDate = new Date(now);
          matchDate.setDate(now.getDate() + tpl.dateOffsetDays);
          matchDate.setUTCHours(tpl.hourUtc, tpl.minuteUtc, 0, 0);

          db.insert(matches).values({
            id: tpl.id,
            leagueId: tpl.leagueId,
            homeTeamId: tpl.homeTeam.id,
            awayTeamId: tpl.awayTeam.id,
            homeScore: tpl.homeScore,
            awayScore: tpl.awayScore,
            status: tpl.status,
            matchTime: tpl.matchTime,
            matchDate: matchDate,
            source: 'pre-stored',
            updatedAt: new Date(),
          }).catch(() => null);
        }
      }
    }

    result = leagueMatches;
  }

  // 3. Date Filter (Strict comparison without timezone drift)
  if (date) {
    const reqDateStr = String(date).trim();
    result = result.filter(m => {
      if (!m.matchDate) return false;
      const d = new Date(m.matchDate);
      const isoDateUtc = d.toISOString().split('T')[0];

      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const formattedUtc = `${year}-${month}-${day}`;

      const localYear = d.getFullYear();
      const localMonth = String(d.getMonth() + 1).padStart(2, '0');
      const localDay = String(d.getDate()).padStart(2, '0');
      const formattedLocal = `${localYear}-${localMonth}-${localDay}`;

      return reqDateStr === isoDateUtc || reqDateStr === formattedUtc || reqDateStr === formattedLocal;
    });
  }

  // 4. Format & Translate names safely
  const formatted = result.map((m: any) => {
    const safeDate = m.matchDate ? new Date(m.matchDate).toISOString() : new Date().toISOString();
    const d = new Date(safeDate);
    let formattedTime = '00:00';
    if (!isNaN(d.getTime())) {
      formattedTime = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }

    const homeRawName = m.homeTeam?.name || '';
    const awayRawName = m.awayTeam?.name || '';
    const homeName = getArabicTeamName(homeRawName);
    const awayName = getArabicTeamName(awayRawName);
    const normalizedCode = COMPETITION_CODE_MAP[m.leagueId] || m.leagueId || 'PL';
    const leagueName = LEAGUE_AR_NAMES[normalizedCode] || LEAGUE_AR_NAMES[m.leagueId] || m.league?.name || 'بطولة عالمية';

    return {
      id: String(m.id),
      leagueId: String(normalizedCode),
      leagueName,
      homeTeam: {
        id: String(m.homeTeam?.id || m.homeTeamId),
        name: homeName,
        logo: m.homeTeam?.logo || 'https://via.placeholder.com/60/cccccc/808080?text=?',
      },
      awayTeam: {
        id: String(m.awayTeam?.id || m.awayTeamId),
        name: awayName,
        logo: m.awayTeam?.logo || 'https://via.placeholder.com/60/cccccc/808080?text=?',
      },
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      minute: m.status === 'LIVE' ? 'مباشر' : null,
      matchTime: m.status === 'LIVE' ? 'مباشر' : (m.status === 'FINISHED' ? 'انتهت' : formattedTime),
      matchDate: safeDate,
      kickoffTime: formattedTime,
      utcDate: safeDate,
    };
  });

  // 5. Sort matches
  if (sortBy === 'date_desc') {
    formatted.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
  } else {
    // Default: chronological
    formatted.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  }

  return formatted;
}

/**
 * Returns stored standings directly from DB / memory cache (0 external API requests).
 */
export async function getStoredStandings(leagueCodeOrId: string, season: string = '2026') {
  const code = COMPETITION_CODE_MAP[leagueCodeOrId] || ID_TO_CODE[leagueCodeOrId] || leagueCodeOrId || 'PL';

  // 1. Check in-memory cache first
  const inMemory = memoryStandingsCache.get(code);
  if (inMemory && inMemory.data && inMemory.data.length > 0) {
    return inMemory.data;
  }

  // 2. Check DB
  try {
    const dbRow = await db.select().from(standingsCache).where(eq(standingsCache.leagueId, code));
    if (dbRow.length > 0 && Array.isArray(dbRow[0].data) && dbRow[0].data.length > 0) {
      const data = dbRow[0].data as any[];
      // Update memory cache
      memoryStandingsCache.set(code, { data, timestamp: Date.now() });
      return data;
    }
  } catch (err: any) {
    console.warn(`[footballService] DB read standings notice for ${code}:`, err.message || err);
  }

  // 3. Fallback: Use pre-stored standings if available
  const preStored = PRE_STORED_STANDINGS[code];
  if (preStored && preStored.length > 0) {
    memoryStandingsCache.set(code, { data: preStored, timestamp: Date.now() });
    db.insert(standingsCache).values({
      leagueId: code,
      season: '2026',
      data: preStored,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: standingsCache.leagueId,
      set: { data: preStored, updatedAt: new Date() }
    }).catch(() => null);
    return preStored;
  }

  return [];
}

/**
 * Low-level API caller used by the sync worker and on-demand cache.
 * Automatically tries current season and falls back to previous seasons (e.g. 2025, 2024, 2023, 2022, 2021)
 * if the tournament/competition hasn't started yet or has no active standings.
 */
export async function fetchStandingsFromApi(leagueCodeOrId: string, requestedSeason?: string) {
  const code = COMPETITION_CODE_MAP[leagueCodeOrId] || ID_TO_CODE[leagueCodeOrId] || leagueCodeOrId || 'PL';
  
  // Build priority list of seasons to attempt
  const seasonsToTry: (string | undefined)[] = [];
  if (requestedSeason && requestedSeason !== 'current' && /^\d{4}$/.test(requestedSeason)) {
    seasonsToTry.push(requestedSeason);
  }
  // Try current season first without explicit query
  seasonsToTry.push(undefined);

  // Fallback to recent prior seasons
  const currentYear = new Date().getFullYear();
  for (let yr = currentYear; yr >= currentYear - 5; yr--) {
    const yrStr = String(yr);
    if (!seasonsToTry.includes(yrStr)) {
      seasonsToTry.push(yrStr);
    }
  }

  for (const seasonAttempt of seasonsToTry) {
    try {
      const endpoint = seasonAttempt 
        ? `/competitions/${code}/standings?season=${seasonAttempt}` 
        : `/competitions/${code}/standings`;
      
      const data = await fetchFromFootballData(endpoint).catch(() => null);
      if (!data || !data.standings || data.standings.length === 0) {
        continue;
      }

      let allTableItems: any[] = [];
      // 1. Look for overall TOTAL table without group
      const totalTable = data.standings.find((s: any) => s.type === 'TOTAL' && !s.group) 
        || data.standings.find((s: any) => s.type === 'TOTAL') 
        || data.standings[0];
      
      if (totalTable && Array.isArray(totalTable.table) && totalTable.table.length > 0) {
        allTableItems = totalTable.table;
      } else {
        // 2. Tournament groups fallback (e.g. EC, WC, CL group stages)
        const flattened = data.standings.flatMap((s: any) => s.table || []);
        if (flattened.length > 0) {
          allTableItems = flattened;
        }
      }

      if (allTableItems.length > 0) {
        const formatted = allTableItems.map((item: any, idx: number) => ({
          id: String(item.team?.id || idx + 1),
          rank: item.position || idx + 1,
          team: {
            id: String(item.team?.id || idx + 1),
            name: getArabicTeamName(item.team?.name || ''),
            logo: item.team?.crest || '',
          },
          played: item.playedGames ?? 0,
          won: item.won ?? 0,
          drawn: item.draw ?? 0,
          lost: item.lost ?? 0,
          goalsFor: item.goalsFor ?? 0,
          goalsAgainst: item.goalsAgainst ?? 0,
          goalDifference: item.goalDifference ?? 0,
          points: item.points ?? 0,
        }));

        console.log(`[footballService] Successfully loaded standings for [${code}] (season ${seasonAttempt || 'current'}, ${formatted.length} teams).`);
        return formatted;
      }
    } catch (err: any) {
      // Continue to next season attempt
    }
  }

  return [];
}

// Backward compatibility exports
export const fetchLiveMatches = syncMatchesCycle;
export const fetchUpcomingMatches = syncMatchesCycle;
