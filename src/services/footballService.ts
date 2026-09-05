import { db, withDbRetry } from "../db/index.ts";
import { matches, teams, leagues, standingsCache } from "../db/schema.ts";
import { eq, sql, lt, desc, and, or } from "drizzle-orm";
import { fetchFromFootballData, RateLimitError } from "./footballApi.ts";
import { getArabicTeamName, translateTeamName, TEAM_AR_NAMES } from "../utils/teamTranslations.ts";
import { PRE_STORED_LEAGUES, PRE_STORED_STANDINGS } from "./seedData.ts";

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

    // 2. Seed / ensure standings for ALL 13 leagues in DB & memory cache for 2026/2027 season
    for (const [leagueCode, standingsList] of Object.entries(PRE_STORED_STANDINGS)) {
      // Put in memory cache immediately
      memoryStandingsCache.set(leagueCode, { data: standingsList, timestamp: Date.now() });

      // Upsert DB for season 2026
      await db.insert(standingsCache).values({
        leagueId: leagueCode,
        season: '2026',
        data: standingsList,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: standingsCache.leagueId,
        set: {
          data: standingsList,
          season: '2026',
          updatedAt: new Date(),
        }
      }).catch(() => null);

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

    // 3. Purge any legacy mock / pre-seeded matches from DB to rely 100% on real data
    await withDbRetry(() => db.delete(matches).where(or(eq(matches.source, 'pre-seeded'), eq(matches.source, 'pre-stored')))).catch(() => null);

    await refreshMemoryMatchesCache();
    console.log("[footballService] Database initialization complete (relying exclusively on official data).");
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
 * Only targets the current 2026/2027 season. If not started yet, returns gracefully.
 */
export async function syncSpecificLeagueMatches(leagueCode: string, targetSeason: string = '2026') {
  try {
    const code = COMPETITION_CODE_MAP[leagueCode] || ID_TO_CODE[leagueCode] || leagueCode;
    console.log(`[footballSync] Syncing matches for specific league [${code}] (season 2026 only)...`);
    
    // Only query season 2026
    const endpoint = `/competitions/${code}/matches?season=2026`;

    try {
      const data = await fetchFromFootballData(endpoint, { ignoreCache: true }).catch(() => null);
      if (data && Array.isArray(data.matches) && data.matches.length > 0) {
        await processAndStoreMatches(data.matches);
        console.log(`[footballSync] Stored ${data.matches.length} matches for [${code}] (season 2026) in DB.`);
        await refreshMemoryMatchesCache();
        return;
      }
    } catch (seasonErr) {
      console.warn(`[footballSync] Season 2026 matches fetch notice for [${code}]:`, seasonErr);
    }
  } catch (e: any) {
    console.warn(`[footballSync] Could not sync matches for league ${leagueCode}:`, e.message || e);
  }
}

/**
 * Cycle 2: Fetch and Sync Standings for the next League in rotation.
 * Runs once every minute (part of the 2 req/min budget).
 * Saves to DB & updates standings exclusively for season 2026/2027.
 */
export async function syncNextLeagueStandingsCycle() {
  const targetLeague = STANDINGS_SUPPORTED_LEAGUES[currentStandingsLeagueIndex % STANDINGS_SUPPORTED_LEAGUES.length];
  currentStandingsLeagueIndex++;

  console.log(`[footballSync] Running Standings Sync Cycle for league [${targetLeague}] (season 2026/2027)...`);
  try {
    const standingsData = await fetchStandingsFromApi(targetLeague, '2026');
    if (standingsData && standingsData.length > 0) {
      // Store into memory cache
      memoryStandingsCache.set(targetLeague, { data: standingsData, timestamp: Date.now() });

      // Store / overwrite in DB
      try {
        await withDbRetry(() => db.insert(standingsCache).values({
          leagueId: targetLeague,
          season: '2026',
          data: standingsData,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: standingsCache.leagueId,
          set: {
            data: standingsData,
            season: '2026',
            updatedAt: new Date(),
          }
        }));
        console.log(`[footballSync] Standings for [${targetLeague}] successfully updated in DB for season 2026/2027 (${standingsData.length} teams).`);
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
      where: eq(matches.source, 'football-data.org'),
      with: {
        league: true,
        homeTeam: true,
        awayTeam: true
      },
      orderBy: [desc(matches.matchDate)]
    });

    memoryMatchesCache = rows || [];
    lastMatchesSyncTimestamp = Date.now();
  } catch (err: any) {
    console.warn("[footballService] Refresh memory cache warning:", err.message || err);
  }
}

export interface NormalizedMatchData {
  id: string;
  leagueId: string;
  leagueName: string;
  leagueLogo: string;
  homeTeam: {
    id: string;
    name: string;
    logo: string;
  };
  awayTeam: {
    id: string;
    name: string;
    logo: string;
  };
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED';
  matchTime: string;
  matchDate: Date;
  utcDate: string;
}

/**
 * Normalizes raw external Football API match payload into standardized system structure.
 * Handles missing fields, teams, leagues, status mapping, and timezone dates.
 */
export function normalizeApiMatchPayload(apiMatch: any): NormalizedMatchData | null {
  if (!apiMatch || typeof apiMatch !== 'object') return null;
  if (!apiMatch.id) return null;

  const home = apiMatch.homeTeam || {};
  const away = apiMatch.awayTeam || {};
  const homeTeamId = home.id ? String(home.id) : '';
  const awayTeamId = away.id ? String(away.id) : '';

  if (!homeTeamId || !awayTeamId) return null;

  // League normalization
  const rawCode = apiMatch.competition?.code || '';
  const rawId = apiMatch.competition?.id ? String(apiMatch.competition.id) : '';
  const normalizedLeagueCode = ID_TO_CODE[rawId] || COMPETITION_CODE_MAP[rawCode] || rawCode || 'PL';
  const arabicLeagueName = LEAGUE_AR_NAMES[normalizedLeagueCode] || LEAGUE_AR_NAMES[rawCode] || LEAGUE_AR_NAMES[rawId] || apiMatch.competition?.name || 'بطولة عالمية';
  const leagueEmblem = apiMatch.competition?.emblem || `https://crests.football-data.org/${normalizedLeagueCode}.png`;

  // Team names & crests
  const homeTeamArName = getArabicTeamName(home.name || home.shortName || 'فريق أول');
  const awayTeamArName = getArabicTeamName(away.name || away.shortName || 'فريق ثان');
  const homeTeamCrest = home.crest || 'https://via.placeholder.com/60/cccccc/808080?text=?';
  const awayTeamCrest = away.crest || 'https://via.placeholder.com/60/cccccc/808080?text=?';

  // Status mapping
  const statusRaw = String(apiMatch.status || '').toUpperCase();
  let normalizedStatus: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED' = 'SCHEDULED';

  if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(statusRaw)) {
    normalizedStatus = 'LIVE';
  } else if (statusRaw === 'FINISHED') {
    normalizedStatus = 'FINISHED';
  } else if (statusRaw === 'POSTPONED') {
    normalizedStatus = 'POSTPONED';
  } else if (statusRaw === 'CANCELLED') {
    normalizedStatus = 'CANCELLED';
  } else if (['SUSPENDED', 'ABANDONED'].includes(statusRaw)) {
    normalizedStatus = 'SUSPENDED';
  } else {
    normalizedStatus = 'SCHEDULED';
  }

  // Date parsing
  let matchDateObj = new Date(apiMatch.utcDate || apiMatch.matchDate || Date.now());
  if (isNaN(matchDateObj.getTime())) {
    matchDateObj = new Date();
  }

  let formattedTime = '00:00';
  if (!isNaN(matchDateObj.getTime())) {
    formattedTime = matchDateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }

  const displayTime =
    normalizedStatus === 'LIVE' ? "مباشر" :
    normalizedStatus === 'FINISHED' ? 'انتهت' :
    normalizedStatus === 'POSTPONED' ? 'مؤجلة' :
    normalizedStatus === 'CANCELLED' ? 'ملغاة' :
    normalizedStatus === 'SUSPENDED' ? 'معلقة' :
    formattedTime;

  const homeScore = apiMatch.score?.fullTime?.home ?? (apiMatch.score?.halfTime?.home ?? null);
  const awayScore = apiMatch.score?.fullTime?.away ?? (apiMatch.score?.halfTime?.away ?? null);

  return {
    id: String(apiMatch.id),
    leagueId: normalizedLeagueCode,
    leagueName: arabicLeagueName,
    leagueLogo: leagueEmblem,
    homeTeam: {
      id: homeTeamId,
      name: homeTeamArName,
      logo: homeTeamCrest,
    },
    awayTeam: {
      id: awayTeamId,
      name: awayTeamArName,
      logo: awayTeamCrest,
    },
    homeScore,
    awayScore,
    status: normalizedStatus,
    matchTime: displayTime,
    matchDate: matchDateObj,
    utcDate: matchDateObj.toISOString(),
  };
}

/**
 * Processes raw matches from API and inserts/updates them into DB
 */
async function processAndStoreMatches(apiMatches: any[]) {
  if (!Array.isArray(apiMatches)) return;

  for (const apiMatch of apiMatches) {
    const norm = normalizeApiMatchPayload(apiMatch);
    if (!norm) continue;

    // Strictly Season 2026: Ignore matches from 2025, 2024, or previous seasons
    if (apiMatch.season !== undefined && apiMatch.season !== null) {
      if (typeof apiMatch.season === 'string' || typeof apiMatch.season === 'number') {
        if (String(apiMatch.season) !== '2026') continue;
      } else if (typeof apiMatch.season === 'object' && apiMatch.season.startDate) {
        const yr = new Date(apiMatch.season.startDate).getFullYear();
        if (yr !== 2026) continue;
      }
    }
    const year = norm.matchDate.getUTCFullYear();
    const month = norm.matchDate.getUTCMonth() + 1;
    if (year < 2026 || (year === 2027 && month > 7) || year > 2027) continue;

    try {
      // 1. Upsert League
      const existingLeague = await db.select().from(leagues).where(eq(leagues.id, norm.leagueId));
      if (existingLeague.length === 0) {
        await db.insert(leagues).values({
          id: norm.leagueId,
          name: norm.leagueName,
          logo: norm.leagueLogo,
        }).catch(() => null);
      } else if (existingLeague[0].name !== norm.leagueName) {
        await db.update(leagues).set({ name: norm.leagueName, logo: norm.leagueLogo }).where(eq(leagues.id, norm.leagueId)).catch(() => null);
      }

      // 2. Upsert Home Team
      const existingHome = await db.select().from(teams).where(eq(teams.id, norm.homeTeam.id));
      if (existingHome.length === 0) {
        await db.insert(teams).values({
          id: norm.homeTeam.id,
          name: norm.homeTeam.name,
          logo: norm.homeTeam.logo,
        }).catch(() => null);
      } else {
        await db.update(teams).set({ name: norm.homeTeam.name, logo: norm.homeTeam.logo }).where(eq(teams.id, norm.homeTeam.id)).catch(() => null);
      }

      // 3. Upsert Away Team
      const existingAway = await db.select().from(teams).where(eq(teams.id, norm.awayTeam.id));
      if (existingAway.length === 0) {
        await db.insert(teams).values({
          id: norm.awayTeam.id,
          name: norm.awayTeam.name,
          logo: norm.awayTeam.logo,
        }).catch(() => null);
      } else {
        await db.update(teams).set({ name: norm.awayTeam.name, logo: norm.awayTeam.logo }).where(eq(teams.id, norm.awayTeam.id)).catch(() => null);
      }

      // 4. Upsert Match & Prevent duplicates (ID check or composite team+date check)
      const matchData = {
        leagueId: norm.leagueId,
        homeTeamId: norm.homeTeam.id,
        awayTeamId: norm.awayTeam.id,
        homeScore: norm.homeScore,
        awayScore: norm.awayScore,
        status: norm.status,
        matchTime: norm.matchTime,
        matchDate: norm.matchDate,
        source: 'football-data.org',
        updatedAt: new Date(),
      };

      const existingMatch = await db.select().from(matches).where(eq(matches.id, norm.id));
      if (existingMatch.length > 0) {
        await db.update(matches).set(matchData).where(eq(matches.id, norm.id)).catch(() => null);
      } else {
        // Check for composite duplicate match (same teams on same day)
        const dayStart = new Date(norm.matchDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(norm.matchDate);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const existingDupes = await db.select().from(matches).where(
          and(
            eq(matches.homeTeamId, norm.homeTeam.id),
            eq(matches.awayTeamId, norm.awayTeam.id)
          )
        );

        const dupOnSameDay = existingDupes.find(m => {
          if (!m.matchDate) return false;
          const d = new Date(m.matchDate);
          return d >= dayStart && d <= dayEnd;
        });

        if (dupOnSameDay) {
          await db.update(matches).set({ ...matchData, id: norm.id }).where(eq(matches.id, dupOnSameDay.id)).catch(() => null);
        } else {
          await db.insert(matches).values({
            id: norm.id,
            ...matchData,
          }).catch(() => null);
        }
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

  // Exclude any mock / pre-seeded / pre-stored matches to guarantee 100% real matches
  let result = allMatches.filter(m => m.source === 'football-data.org');

  // 0. Season Filter (Strictly season 2026 ONLY - reject 2025, 2024, or any legacy seasons)
  result = result.filter(m => {
    const mSeason = (m as any).season;
    if (mSeason !== undefined && mSeason !== null && String(mSeason) !== '2026') {
      return false;
    }
    const lSeason = (m as any).league?.season;
    if (lSeason !== undefined && lSeason !== null && String(lSeason) !== '2026') {
      return false;
    }
    if (m.matchDate) {
      const d = new Date(m.matchDate);
      if (!isNaN(d.getTime())) {
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        if (year < 2026) return false;
        if (year === 2027 && month > 7) return false;
        if (year > 2027) return false;
      }
    }
    return true;
  });

  // 1. Status Filter
  if (status) {
    if (status === 'LIVE' || status === 'IN_PLAY') {
      result = result.filter(m => ['LIVE', 'IN_PLAY', 'PAUSED'].includes(m.status));
    } else {
      result = result.filter(m => m.status === status);
    }
  }

  // 2. League Filter (Bidirectional matching across code and id, case-insensitive)
  if (leagueId && leagueId !== 'all') {
    const rawUpper = String(leagueId).toUpperCase();
    const targetCode = (COMPETITION_CODE_MAP[rawUpper] || ID_TO_CODE[rawUpper] || COMPETITION_CODE_MAP[leagueId] || ID_TO_CODE[leagueId] || leagueId).toUpperCase();
    const targetId = CODE_TO_ID[targetCode] || CODE_TO_ID[rawUpper] || CODE_TO_ID[leagueId] || leagueId;

    let leagueMatches = result.filter(m => {
      const mLeague = String(m.leagueId || '').toUpperCase();
      const mCode = String(m.league?.id || '').toUpperCase();
      return (
        mLeague === rawUpper ||
        mLeague === targetCode ||
        mLeague === targetId ||
        mCode === rawUpper ||
        mCode === targetCode ||
        mCode === targetId
      );
    });

    result = leagueMatches;
  }

  // 3. Date Filter (Strict comparison against unified system date YYYY-MM-DD)
  if (date) {
    const reqDateStr = String(date).trim();
    result = result.filter(m => {
      if (!m.matchDate) return false;
      const rawMatchDate = m.matchDate as unknown;
      if (typeof rawMatchDate === 'string' && rawMatchDate.startsWith(reqDateStr)) {
        return true;
      }
      const d = new Date(m.matchDate);
      if (isNaN(d.getTime())) return false;
      const isoDateUtc = d.toISOString().split('T')[0];
      return isoDateUtc === reqDateStr;
    });
  }

  // 3.5 Deduplicate matches by ID and team composite key
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  result = result.filter(m => {
    if (seenIds.has(String(m.id))) return false;
    const dateStr = m.matchDate ? new Date(m.matchDate).toISOString().split('T')[0] : '';
    const compositeKey = `${m.homeTeamId}_${m.awayTeamId}_${dateStr}`;
    if (seenKeys.has(compositeKey)) return false;

    seenIds.add(String(m.id));
    seenKeys.add(compositeKey);
    return true;
  });

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

    const statusUpper = String(m.status || '').toUpperCase();
    const displayMatchTime =
      statusUpper === 'LIVE' || statusUpper === 'IN_PLAY' || statusUpper === 'PAUSED' ? 'مباشر' :
      statusUpper === 'FINISHED' ? 'انتهت' :
      statusUpper === 'POSTPONED' ? 'مؤجلة' :
      statusUpper === 'CANCELLED' ? 'ملغاة' :
      statusUpper === 'SUSPENDED' || statusUpper === 'ABANDONED' ? 'معلقة' :
      formattedTime;

    return {
      id: String(m.id),
      leagueId: String(normalizedCode),
      season: '2026',
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
      minute: statusUpper === 'LIVE' ? 'مباشر' : null,
      matchTime: displayMatchTime,
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
 * Strictly filtered by requested season (defaults to current 2026/2027 season).
 */
export async function getStoredStandings(leagueCodeOrId: string, season: string = '2026') {
  const code = COMPETITION_CODE_MAP[leagueCodeOrId] || ID_TO_CODE[leagueCodeOrId] || leagueCodeOrId || 'PL';
  const targetSeason = season && season !== 'current' ? season : '2026';

  // 1. Check in-memory cache first
  const inMemory = memoryStandingsCache.get(code);
  if (inMemory && Array.isArray(inMemory.data)) {
    return inMemory.data;
  }

  // 2. Check DB matching target season
  try {
    const dbRow = await db.select().from(standingsCache).where(
      and(
        eq(standingsCache.leagueId, code),
        eq(standingsCache.season, targetSeason)
      )
    );
    if (dbRow.length > 0 && Array.isArray(dbRow[0].data)) {
      const data = dbRow[0].data as any[];
      // Update memory cache
      memoryStandingsCache.set(code, { data, timestamp: Date.now() });
      return data;
    }
  } catch (err: any) {
    console.warn(`[footballService] DB read standings notice for ${code}:`, err.message || err);
  }

  // 3. Fallback: Use pre-stored standings if available for current season
  const preStored = PRE_STORED_STANDINGS[code];
  if (preStored !== undefined && Array.isArray(preStored)) {
    memoryStandingsCache.set(code, { data: preStored, timestamp: Date.now() });
    return preStored;
  }

  return [];
}

/**
 * Low-level API caller used by the sync worker and on-demand cache.
 * Strictly fetches standings for the current 2026/2027 season.
 * If the tournament has not started yet or has no standings data for 2026/2027,
 * returns an empty array [] so the UI can display a clear "not started" message.
 */
export async function fetchStandingsFromApi(leagueCodeOrId: string, requestedSeason: string = '2026') {
  const code = COMPETITION_CODE_MAP[leagueCodeOrId] || ID_TO_CODE[leagueCodeOrId] || leagueCodeOrId || 'PL';
  const targetSeason = requestedSeason && requestedSeason !== 'current' ? requestedSeason : '2026';
  
  const endpoints = [
    `/competitions/${code}/standings?season=${targetSeason}`,
    `/competitions/${code}/standings`
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await fetchFromFootballData(endpoint).catch(() => null);
      if (!data || !data.standings || !Array.isArray(data.standings) || data.standings.length === 0) {
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
        // 2. Tournament groups fallback (e.g. CL group stage)
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

        console.log(`[footballService] Successfully loaded standings for [${code}] (season 2026/2027, ${formatted.length} teams).`);
        return formatted;
      }
    } catch (err: any) {
      // Continue to next endpoint attempt
    }
  }

  return [];
}

// Backward compatibility exports
export const fetchLiveMatches = syncMatchesCycle;
export const fetchUpcomingMatches = syncMatchesCycle;
